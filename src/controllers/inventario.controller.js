const db = require('../config/db');

// ============================================
// CONTROLADOR DE INVENTARIO
// ============================================

// Registrar producción (agregar stock)
const registrarProduccion = async (req, res) => {
    try {
        const { productoId, cantidad, fechaProduccion, observaciones } = req.body;
        
        console.log(`🥖 Registrando producción: ${cantidad} unidades del producto ID ${productoId}`);
        
        // Validar
        if (!productoId || !cantidad || cantidad <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Producto ID y cantidad positiva son requeridos'
            });
        }
        
        // Iniciar transacción
        const connection = await db.beginTransaction();
        
        try {
            // 1. Actualizar stock del producto
            await connection.execute(
                `UPDATE menu_productos 
                 SET stock_actual = stock_actual + ? 
                 WHERE id = ?`,
                [cantidad, productoId]
            );
            
            // 2. Registrar en tabla de movimientos (crear tabla si no existe)
            await connection.execute(
                `INSERT INTO menu_movimientos_stock 
                 (producto_id, tipo, cantidad, fecha, observaciones, created_by)
                 VALUES (?, 'ENTRADA', ?, ?, ?, ?)`,
                [
                    productoId,
                    cantidad,
                    fechaProduccion || new Date(),
                    observaciones || 'Producción diaria',
                    req.user?.id || 'sistema'
                ]
            );
            
            await connection.commit();
            
            // Obtener stock actualizado
            const [producto] = await connection.execute(
                `SELECT id, nombre, stock_actual FROM menu_productos WHERE id = ?`,
                [productoId]
            );
            
            res.json({
                success: true,
                message: '✅ Producción registrada correctamente',
                data: {
                    producto: producto[0],
                    cantidadAgregada: cantidad,
                    stockActual: producto[0]?.stock_actual || 0
                }
            });
            
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
        
    } catch (error) {
        console.error('❌ Error al registrar producción:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error al registrar producción',
            error: error.message
        });
    }
};

// Registrar venta (descontar stock)
const registrarVenta = async (req, res) => {
    try {
        const { items } = req.body; // [{ productoId, cantidad, precio }]
        
        console.log(`🛒 Registrando venta con ${items.length} productos`);
        
        const connection = await db.beginTransaction();
        
        try {
            const resultados = [];
            
            for (const item of items) {
                // Verificar stock suficiente
                const [producto] = await connection.execute(
                    `SELECT id, nombre, stock_actual FROM menu_productos WHERE id = ?`,
                    [item.productoId]
                );
                
                if (!producto[0]) {
                    throw new Error(`Producto ID ${item.productoId} no encontrado`);
                }
                
                if (producto[0].stock_actual < item.cantidad) {
                    throw new Error(`Stock insuficiente para ${producto[0].nombre}. Disponible: ${producto[0].stock_actual}`);
                }
                
                // Descontar stock
                await connection.execute(
                    `UPDATE menu_productos 
                     SET stock_actual = stock_actual - ? 
                     WHERE id = ?`,
                    [item.cantidad, item.productoId]
                );
                
                // Registrar movimiento
                await connection.execute(
                    `INSERT INTO menu_movimientos_stock 
                     (producto_id, tipo, cantidad, precio_unitario, created_by)
                     VALUES (?, 'SALIDA', ?, ?, ?)`,
                    [
                        item.productoId,
                        item.cantidad,
                        item.precio || 0,
                        req.user?.id || 'sistema'
                    ]
                );
                
                resultados.push({
                    productoId: item.productoId,
                    nombre: producto[0].nombre,
                    cantidad: item.cantidad,
                    stockRestante: producto[0].stock_actual - item.cantidad
                });
            }
            
            await connection.commit();
            
            res.json({
                success: true,
                message: '✅ Venta registrada correctamente',
                data: resultados
            });
            
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
        
    } catch (error) {
        console.error('❌ Error al registrar venta:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al registrar venta'
        });
    }
};

// Obtener inventario actual
const obtenerInventario = async (req, res) => {
    try {
        const [rows] = await db.pool.execute(`
            SELECT 
                p.id,
                p.nombre,
                p.categoria_nombre,
                p.stock_actual,
                p.stock_minimo,
                p.unidad_medida,
                p.precio_normal,
                CASE 
                    WHEN p.stock_actual <= 0 THEN 'AGOTADO'
                    WHEN p.stock_actual <= p.stock_minimo THEN 'STOCK BAJO'
                    ELSE 'DISPONIBLE'
                END AS estado_stock
            FROM view_menu_productos p
            ORDER BY estado_stock, p.nombre
        `);
        
        // Estadísticas
        const stats = {
            totalProductos: rows.length,
            productosConStock: rows.filter(p => p.stock_actual > 0).length,
            productosAgotados: rows.filter(p => p.stock_actual <= 0).length,
            stockBajo: rows.filter(p => p.stock_actual > 0 && p.stock_actual <= p.stock_minimo).length,
            stockTotal: rows.reduce((sum, p) => sum + (p.stock_actual || 0), 0)
        };
        
        res.json({
            success: true,
            data: rows,
            stats
        });
        
    } catch (error) {
        console.error('❌ Error al obtener inventario:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error al obtener inventario',
            error: error.message
        });
    }
};

// Obtener historial de movimientos
const obtenerMovimientos = async (req, res) => {
    try {
        const { productoId, fechaInicio, fechaFin, tipo } = req.query;
        
        let query = `
            SELECT 
                m.*,
                p.nombre as producto_nombre
            FROM menu_movimientos_stock m
            JOIN menu_productos p ON m.producto_id = p.id
            WHERE 1=1
        `;
        const params = [];
        
        if (productoId) {
            query += ` AND m.producto_id = ?`;
            params.push(productoId);
        }
        
        if (tipo) {
            query += ` AND m.tipo = ?`;
            params.push(tipo);
        }
        
        if (fechaInicio) {
            query += ` AND m.fecha >= ?`;
            params.push(fechaInicio);
        }
        
        if (fechaFin) {
            query += ` AND m.fecha <= ?`;
            params.push(fechaFin);
        }
        
        query += ` ORDER BY m.fecha DESC LIMIT 100`;
        
        const [rows] = await db.pool.execute(query, params);
        
        res.json({
            success: true,
            data: rows
        });
        
    } catch (error) {
        console.error('❌ Error al obtener movimientos:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error al obtener movimientos',
            error: error.message
        });
    }
};

// Ajustar stock manualmente
const ajustarStock = async (req, res) => {
    try {
        const { productoId, nuevoStock, motivo } = req.body;
        
        const connection = await db.beginTransaction();
        
        try {
            const [producto] = await connection.execute(
                `SELECT stock_actual FROM menu_productos WHERE id = ?`,
                [productoId]
            );
            
            if (!producto[0]) {
                throw new Error('Producto no encontrado');
            }
            
            const diferencia = nuevoStock - producto[0].stock_actual;
            const tipo = diferencia > 0 ? 'ENTRADA' : 'SALIDA';
            
            // Actualizar stock
            await connection.execute(
                `UPDATE menu_productos SET stock_actual = ? WHERE id = ?`,
                [nuevoStock, productoId]
            );
            
            // Registrar ajuste
            await connection.execute(
                `INSERT INTO menu_movimientos_stock 
                 (producto_id, tipo, cantidad, observaciones, created_by)
                 VALUES (?, 'AJUSTE', ?, ?, ?)`,
                [productoId, Math.abs(diferencia), motivo || 'Ajuste manual', req.user?.id || 'sistema']
            );
            
            await connection.commit();
            
            res.json({
                success: true,
                message: '✅ Stock ajustado correctamente',
                data: {
                    productoId,
                    stockAnterior: producto[0].stock_actual,
                    stockNuevo: nuevoStock,
                    diferencia
                }
            });
            
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
        
    } catch (error) {
        console.error('❌ Error al ajustar stock:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al ajustar stock'
        });
    }
};

module.exports = {
    registrarProduccion,
    registrarVenta,
    obtenerInventario,
    obtenerMovimientos,
    ajustarStock
};