const db = require('../config/db');
const nodemailer = require('nodemailer');

// ============================================
// CONTROLADOR PARA "MENÚ DE PRODUCTOS"
// CON GESTIÓN COMPLETA DE STOCK Y CORREOS
// ============================================

// ===== CONFIGURACIÓN DE CORREO =====
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'esthalexboob06@gmail.com',
    pass: 'ridx iebx zvho btqg'
  }
});

// ===== CATEGORÍAS =====
const obtenerCategorias = async (req, res) => {
    try {
        console.log('📦 Obteniendo categorías...');
        
        const [rows] = await db.pool.execute('SELECT * FROM view_menu_categorias');
        
        console.log(`✅ ${rows.length} categorías encontradas`);
        
        res.json({
            success: true,
            data: rows
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error al obtener categorías',
            error: error.message
        });
    }
};

const agregarCategoria = async (req, res) => {
    try {
        const { nombre, descripcion } = req.body;
        
        console.log('➕ Agregando categoría:', nombre);
        
        if (!nombre) {
            return res.status(400).json({
                success: false,
                message: 'El nombre de la categoría es requerido'
            });
        }
        
        const [result] = await db.pool.execute(
            'CALL sp_agregar_categoria(?, ?, ?)',
            [nombre, descripcion || '', req.user?.id || 'sistema']
        );
        
        const nuevaCategoria = {
            id: result[0][0].nuevo_id,
            nombre,
            descripcion: descripcion || '',
            total_productos: 0,
            productos_disponibles: 0,
            productos_destacados: 0
        };
        
        res.json({
            success: true,
            message: '✅ Categoría agregada correctamente',
            data: nuevaCategoria
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: 'Ya existe una categoría con ese nombre'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error al agregar categoría',
            error: error.message
        });
    }
};

const actualizarCategoria = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion } = req.body;
        
        console.log('✏️ Actualizando categoría ID:', id);
        
        const [result] = await db.pool.execute(
            `UPDATE menu_categorias 
             SET nombre = ?, descripcion = ?, created_by = ?
             WHERE id = ? AND is_active = TRUE`,
            [nombre, descripcion || '', req.user?.id || 'sistema', id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Categoría no encontrada'
            });
        }
        
        const [categoria] = await db.pool.execute(
            'SELECT * FROM view_menu_categorias WHERE id = ?',
            [id]
        );
        
        res.json({
            success: true,
            message: '✅ Categoría actualizada correctamente',
            data: categoria[0] || null
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar categoría',
            error: error.message
        });
    }
};

const eliminarCategoria = async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('🗑️ Eliminando categoría ID:', id);
        
        const [result] = await db.pool.execute(
            'CALL sp_eliminar_categoria(?, ?)',
            [id, req.user?.id || 'sistema']
        );
        
        if (result[0][0].eliminadas === 0) {
            return res.status(404).json({
                success: false,
                message: 'Categoría no encontrada'
            });
        }
        
        res.json({
            success: true,
            message: '✅ Categoría eliminada correctamente'
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        
        if (error.message.includes('No se puede eliminar categoría con productos asociados')) {
            return res.status(400).json({
                success: false,
                message: 'No se puede eliminar una categoría que tiene productos asociados'
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error al eliminar categoría',
            error: error.message
        });
    }
};

// ===== PRODUCTOS =====

const obtenerProductos = async (req, res) => {
    try {
        console.log('📦 Obteniendo productos...');
        
        const [rows] = await db.pool.execute('SELECT * FROM view_menu_productos');
        
        const stockBajo = rows.filter(p => 
            p.stock_actual <= (p.stock_minimo || 5) && p.stock_actual > 0
        );
        
        if (stockBajo.length > 0) {
            console.log('⚠️ Productos con stock bajo:', stockBajo.length);
        }
        
        console.log(`✅ ${rows.length} productos encontrados`);
        
        res.json({
            success: true,
            data: rows,
            alertas: {
                stock_bajo: stockBajo.length
            }
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error al obtener productos',
            error: error.message
        });
    }
};

const obtenerProductosPorCategoria = async (req, res) => {
    try {
        const { categoriaId } = req.params;
        
        const [rows] = await db.pool.execute(
            `SELECT * FROM view_menu_productos WHERE categoria_id = ?`,
            [categoriaId]
        );
        
        res.json({
            success: true,
            data: rows
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error al obtener productos',
            error: error.message
        });
    }
};

const agregarProducto = async (req, res) => {
    try {
        const {
            nombre,
            descripcion,
            precioNormal,
            enPromocion,
            precioPromocion,
            categoriaId,
            disponible,
            destacado,
            imagen,
            stock_actual,
            stock_minimo = 5
        } = req.body;
        
        console.log('➕ Agregando producto:', nombre, 'Stock:', stock_actual);
        
        if (!nombre) {
            return res.status(400).json({
                success: false,
                message: 'El nombre del producto es requerido'
            });
        }
        
        if (!precioNormal || precioNormal <= 0) {
            return res.status(400).json({
                success: false,
                message: 'El precio normal debe ser mayor a 0'
            });
        }
        
        if (!categoriaId) {
            return res.status(400).json({
                success: false,
                message: 'La categoría es requerida'
            });
        }
        
        if (enPromocion && (!precioPromocion || precioPromocion <= 0)) {
            return res.status(400).json({
                success: false,
                message: 'El precio de promoción es requerido cuando el producto está en promoción'
            });
        }
        
        try {
            const [result] = await db.pool.execute(
                'CALL sp_agregar_producto(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    nombre,
                    descripcion || '',
                    precioNormal,
                    enPromocion ? 1 : 0,
                    precioPromocion || null,
                    categoriaId,
                    disponible ? 1 : 0,
                    destacado ? 1 : 0,
                    imagen || null,
                    stock_actual || 0,
                    stock_minimo,
                    req.user?.id || 'sistema'
                ]
            );
            
            const [nuevoProducto] = await db.pool.execute(
                'SELECT * FROM view_menu_productos WHERE id = ?',
                [result[0][0].nuevo_id]
            );
            
            res.json({
                success: true,
                message: '✅ Producto agregado correctamente',
                data: nuevoProducto[0] || null
            });
            
        } catch (spError) {
            console.log('⚠️ Usando INSERT directo:', spError.message);
            
            const [result] = await db.pool.execute(
                `INSERT INTO menu_productos (
                    nombre, descripcion, precio_normal, en_promocion, 
                    precio_promocion, categoria_id, disponible, destacado, 
                    imagen, stock_actual, stock_minimo, is_active, version, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, 1, ?)`,
                [
                    nombre,
                    descripcion || '',
                    precioNormal,
                    enPromocion ? 1 : 0,
                    precioPromocion || null,
                    categoriaId,
                    disponible ? 1 : 0,
                    destacado ? 1 : 0,
                    imagen || null,
                    stock_actual || 0,
                    stock_minimo,
                    req.user?.id || 'sistema'
                ]
            );
            
            const [nuevoProducto] = await db.pool.execute(
                'SELECT * FROM view_menu_productos WHERE id = ?',
                [result.insertId]
            );
            
            res.json({
                success: true,
                message: '✅ Producto agregado correctamente',
                data: nuevoProducto[0] || null
            });
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error al agregar producto',
            error: error.message
        });
    }
};

const actualizarProducto = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            nombre,
            descripcion,
            precioNormal,
            enPromocion,
            precioPromocion,
            categoriaId,
            disponible,
            destacado,
            imagen,
            stock_actual,
            stock_minimo
        } = req.body;
        
        console.log('✏️ Actualizando producto ID:', id, 'Stock:', stock_actual);
        
        if (enPromocion && (!precioPromocion || precioPromocion <= 0)) {
            return res.status(400).json({
                success: false,
                message: 'El precio de promoción es requerido cuando el producto está en promoción'
            });
        }
        
        try {
            const [result] = await db.pool.execute(
                'CALL sp_actualizar_producto(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    id,
                    nombre,
                    descripcion || '',
                    precioNormal,
                    enPromocion ? 1 : 0,
                    precioPromocion || null,
                    categoriaId,
                    disponible ? 1 : 0,
                    destacado ? 1 : 0,
                    imagen || null,
                    stock_actual || 0,
                    stock_minimo || 5,
                    req.user?.id || 'sistema'
                ]
            );
            
            if (result[0][0].actualizadas === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Producto no encontrado'
                });
            }
            
        } catch (spError) {
            console.log('⚠️ Usando UPDATE directo:', spError.message);
            
            const [result] = await db.pool.execute(
                `UPDATE menu_productos 
                 SET 
                    nombre = ?,
                    descripcion = ?,
                    precio_normal = ?,
                    en_promocion = ?,
                    precio_promocion = ?,
                    categoria_id = ?,
                    disponible = ?,
                    destacado = ?,
                    imagen = ?,
                    stock_actual = ?,
                    stock_minimo = ?,
                    version = version + 1,
                    updated_at = CURRENT_TIMESTAMP,
                    created_by = ?
                 WHERE id = ? AND is_active = TRUE`,
                [
                    nombre,
                    descripcion || '',
                    precioNormal,
                    enPromocion ? 1 : 0,
                    precioPromocion || null,
                    categoriaId,
                    disponible ? 1 : 0,
                    destacado ? 1 : 0,
                    imagen || null,
                    stock_actual || 0,
                    stock_minimo || 5,
                    req.user?.id || 'sistema',
                    id
                ]
            );
            
            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Producto no encontrado'
                });
            }
        }
        
        const [productoActualizado] = await db.pool.execute(
            'SELECT * FROM view_menu_productos WHERE id = ?',
            [id]
        );
        
        res.json({
            success: true,
            message: '✅ Producto actualizado correctamente',
            data: productoActualizado[0] || null
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar producto',
            error: error.message
        });
    }
};

const eliminarProducto = async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('🗑️ Eliminando producto ID:', id);
        
        const [result] = await db.pool.execute(
            'CALL sp_eliminar_producto(?, ?)',
            [id, req.user?.id || 'sistema']
        );
        
        if (result[0][0].eliminadas === 0) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }
        
        res.json({
            success: true,
            message: '✅ Producto eliminado correctamente'
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar producto',
            error: error.message
        });
    }
};

const reordenarProductos = async (req, res) => {
    try {
        const { id } = req.params;
        const { nuevaPosicion } = req.body;
        
        console.log('🔄 Reordenando producto ID:', id, 'a posición:', nuevaPosicion);
        
        const [producto] = await db.pool.execute(
            'SELECT posicion FROM menu_productos WHERE id = ? AND is_active = TRUE',
            [id]
        );
        
        if (producto.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }
        
        const posicionActual = producto[0].posicion;
        
        if (posicionActual === nuevaPosicion) {
            const [productos] = await db.pool.execute('SELECT * FROM view_menu_productos');
            return res.json({
                success: true,
                message: 'Sin cambios',
                data: productos
            });
        }
        
        await db.pool.execute('START TRANSACTION');
        
        if (nuevaPosicion < posicionActual) {
            await db.pool.execute(
                `UPDATE menu_productos 
                 SET posicion = posicion + 1 
                 WHERE posicion >= ? AND posicion < ? AND is_active = TRUE`,
                [nuevaPosicion, posicionActual]
            );
        } else {
            await db.pool.execute(
                `UPDATE menu_productos 
                 SET posicion = posicion - 1 
                 WHERE posicion <= ? AND posicion > ? AND is_active = TRUE`,
                [nuevaPosicion, posicionActual]
            );
        }
        
        await db.pool.execute(
            `UPDATE menu_productos 
             SET posicion = ?, created_by = ?
             WHERE id = ?`,
            [nuevaPosicion, req.user?.id || 'sistema', id]
        );
        
        await db.pool.execute('COMMIT');
        
        const [productos] = await db.pool.execute('SELECT * FROM view_menu_productos');
        
        res.json({
            success: true,
            message: '✅ Productos reordenados correctamente',
            data: productos
        });
        
    } catch (error) {
        await db.pool.execute('ROLLBACK');
        console.error('❌ Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error al reordenar productos',
            error: error.message
        });
    }
};

// ===== GESTIÓN DE STOCK POR COMPRAS =====

const descontarStockPorCompra = async (req, res) => {
    try {
        const { items, ordenId } = req.body;
        
        console.log('🛒 Procesando compra - Descontando stock:', items);
        
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere un array de items con productoId y cantidad'
            });
        }
        
        const connection = await db.pool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            const resultados = [];
            const alertas = [];
            
            for (const item of items) {
                const { productoId, cantidad } = item;
                
                if (!productoId || !cantidad || cantidad <= 0) {
                    throw new Error(`Item inválido: ${JSON.stringify(item)}`);
                }
                
                const [producto] = await connection.query(
                    'SELECT id, nombre, stock_actual, stock_minimo, disponible FROM menu_productos WHERE id = ? AND is_active = TRUE',
                    [productoId]
                );
                
                if (producto.length === 0) {
                    throw new Error(`Producto ID ${productoId} no encontrado`);
                }
                
                const prod = producto[0];
                
                if (!prod.disponible) {
                    throw new Error(`Producto "${prod.nombre}" no está disponible para la venta`);
                }
                
                if (prod.stock_actual < cantidad) {
                    throw new Error(
                        `Stock insuficiente para "${prod.nombre}". ` +
                        `Disponible: ${prod.stock_actual}, Solicitado: ${cantidad}`
                    );
                }
                
                await connection.query(
                    'UPDATE menu_productos SET stock_actual = stock_actual - ?, version = version + 1, updated_at = NOW() WHERE id = ? AND is_active = TRUE',
                    [cantidad, productoId]
                );
                
                await connection.query(
                    'INSERT INTO menu_movimientos_stock (producto_id, tipo, cantidad, fecha, observaciones, created_by) VALUES (?, "SALIDA", ?, NOW(), ?, ?)',
                    [productoId, cantidad, ordenId ? `Orden #${ordenId}` : 'Venta directa', req.user?.id || 'sistema']
                );
                
                const nuevoStock = prod.stock_actual - cantidad;
                const stockMinimo = prod.stock_minimo || 5;
                
                if (nuevoStock <= 0) {
                    alertas.push({
                        productoId,
                        nombre: prod.nombre,
                        tipo: 'AGOTADO',
                        mensaje: `Producto "${prod.nombre}" AGOTADO`
                    });
                } else if (nuevoStock <= stockMinimo) {
                    alertas.push({
                        productoId,
                        nombre: prod.nombre,
                        tipo: 'STOCK_BAJO',
                        stock_actual: nuevoStock,
                        stock_minimo: stockMinimo,
                        mensaje: `Stock BAJO en "${prod.nombre}": ${nuevoStock} unidades (mínimo ${stockMinimo})`
                    });
                }
                
                resultados.push({
                    productoId,
                    nombre: prod.nombre,
                    stock_anterior: prod.stock_actual,
                    stock_nuevo: nuevoStock,
                    cantidad_vendida: cantidad
                });
            }
            
            await connection.commit();
            
            console.log('✅ Compra procesada correctamente');
            if (alertas.length > 0) {
                console.log('⚠️ ALERTAS:', alertas);
            }
            
            res.json({
                success: true,
                message: '✅ Stock descontado correctamente',
                data: {
                    resultados,
                    alertas,
                    total_productos_actualizados: resultados.length
                }
            });
            
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
        
    } catch (error) {
        console.error('❌ Error descontando stock:', error.message);
        res.status(500).json({
            success: false,
            message: error.message || 'Error al procesar la compra'
        });
    }
};

const revertirStockPorCancelacion = async (req, res) => {
    try {
        const { items, ordenId, motivo } = req.body;
        
        console.log('↩️ Reintegrando stock por cancelación:', items);
        
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere un array de items'
            });
        }
        
        const connection = await db.pool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            for (const item of items) {
                const { productoId, cantidad } = item;
                
                const [producto] = await connection.query(
                    'SELECT nombre FROM menu_productos WHERE id = ?',
                    [productoId]
                );
                
                if (producto.length === 0) {
                    throw new Error(`Producto ID ${productoId} no encontrado`);
                }
                
                await connection.query(
                    'UPDATE menu_productos SET stock_actual = stock_actual + ?, version = version + 1, updated_at = NOW() WHERE id = ? AND is_active = TRUE',
                    [cantidad, productoId]
                );
                
                const observacion = ordenId 
                    ? `CANCELACIÓN Orden #${ordenId}${motivo ? ` - ${motivo}` : ''}`
                    : `AJUSTE manual${motivo ? ` - ${motivo}` : ''}`;
                
                await connection.query(
                    'INSERT INTO menu_movimientos_stock (producto_id, tipo, cantidad, fecha, observaciones, created_by) VALUES (?, "ENTRADA", ?, NOW(), ?, ?)',
                    [productoId, cantidad, observacion, req.user?.id || 'sistema']
                );
            }
            
            await connection.commit();
            
            res.json({
                success: true,
                message: '✅ Stock reintegrado correctamente',
                data: {
                    items_reintegrados: items.length
                }
            });
            
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
        
    } catch (error) {
        console.error('❌ Error reintegrando stock:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const ajustarStock = async (req, res) => {
    try {
        const { productoId, nuevoStock, motivo } = req.body;
        
        console.log('🔧 Ajustando stock manual:', productoId, '→', nuevoStock);
        
        if (!productoId || nuevoStock === undefined || nuevoStock < 0) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere productoId y nuevoStock (mayor o igual a 0)'
            });
        }
        
        const connection = await db.pool.getConnection();
        
        try {
            await connection.beginTransaction();
            
            const [producto] = await connection.query(
                'SELECT stock_actual, nombre FROM menu_productos WHERE id = ? AND is_active = TRUE',
                [productoId]
            );
            
            if (producto.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Producto no encontrado'
                });
            }
            
            const stockActual = producto[0].stock_actual;
            const diferencia = nuevoStock - stockActual;
            
            if (diferencia === 0) {
                return res.json({
                    success: true,
                    message: 'Sin cambios en el stock',
                    data: { stock_actual: stockActual }
                });
            }
            
            await connection.query(
                'UPDATE menu_productos SET stock_actual = ?, version = version + 1, updated_at = NOW() WHERE id = ?',
                [nuevoStock, productoId]
            );
            
            const tipo = diferencia > 0 ? 'ENTRADA' : 'SALIDA';
            await connection.query(
                'INSERT INTO menu_movimientos_stock (producto_id, tipo, cantidad, fecha, observaciones, created_by) VALUES (?, ?, ?, NOW(), ?, ?)',
                [
                    productoId, 
                    tipo, 
                    Math.abs(diferencia), 
                    `AJUSTE manual: ${motivo || 'Sin motivo'} (${stockActual} → ${nuevoStock})`,
                    req.user?.id || 'sistema'
                ]
            );
            
            await connection.commit();
            
            res.json({
                success: true,
                message: `✅ Stock ajustado de ${stockActual} a ${nuevoStock}`,
                data: {
                    productoId,
                    nombre: producto[0].nombre,
                    stock_anterior: stockActual,
                    stock_nuevo: nuevoStock,
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
        console.error('❌ Error ajustando stock:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const obtenerMovimientosStock = async (req, res) => {
    try {
        const { productoId, desde, hasta, tipo, limit = 100 } = req.query;
        
        let query = 'SELECT * FROM menu_movimientos_stock WHERE 1=1';
        const params = [];
        
        if (productoId) {
            query += ' AND producto_id = ?';
            params.push(productoId);
        }
        
        if (tipo) {
            query += ' AND tipo = ?';
            params.push(tipo);
        }
        
        if (desde) {
            query += ' AND fecha >= ?';
            params.push(desde);
        }
        
        if (hasta) {
            query += ' AND fecha <= ?';
            params.push(hasta);
        }
        
        query += ' ORDER BY fecha DESC LIMIT ?';
        params.push(parseInt(limit));
        
        const [movimientos] = await db.pool.execute(query, params);
        
        res.json({
            success: true,
            data: movimientos,
            total: movimientos.length
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error al obtener movimientos de stock'
        });
    }
};

const obtenerAlertasStock = async (req, res) => {
    try {
        const [agotados] = await db.pool.execute(
            `SELECT id, nombre, stock_actual, stock_minimo 
             FROM menu_productos 
             WHERE is_active = TRUE AND stock_actual <= 0`
        );
        
        const [stockBajo] = await db.pool.execute(
            `SELECT id, nombre, stock_actual, stock_minimo 
             FROM menu_productos 
             WHERE is_active = TRUE 
               AND stock_actual > 0 
               AND stock_actual <= COALESCE(stock_minimo, 5)`
        );
        
        res.json({
            success: true,
            data: {
                agotados: agotados.map(p => ({
                    ...p,
                    tipo: 'AGOTADO',
                    mensaje: `❌ ${p.nombre} - AGOTADO`
                })),
                stock_bajo: stockBajo.map(p => ({
                    ...p,
                    tipo: 'STOCK_BAJO',
                    mensaje: `⚠️ ${p.nombre} - Stock bajo: ${p.stock_actual} (mínimo ${p.stock_minimo || 5})`
                })),
                total_alertas: agotados.length + stockBajo.length
            }
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error al obtener alertas de stock'
        });
    }
};

const obtenerDestacados = async (req, res) => {
    try {
        const [rows] = await db.pool.execute(
            `SELECT * FROM view_menu_productos 
             WHERE destacado = 1 AND disponible = 1
             ORDER BY posicion ASC
             LIMIT 10`
        );
        
        res.json({
            success: true,
            data: rows
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error al obtener productos destacados',
            error: error.message
        });
    }
};

// ===== ENVÍO DE CORREOS =====
const enviarCorreoConfirmacion = async (req, res) => {
  try {
    const { email, orden, items, total } = req.body;
    
    console.log('📧 Enviando correo a:', email);
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Email inválido'
      });
    }

    if (!Array.isArray(items)) {
      console.error('❌ Items no es un array:', items);
      return res.status(400).json({
        success: false,
        message: 'Formato de items inválido'
      });
    }

    const listaProductos = items.map(item => {
      if (!item || !item.producto) {
        console.error('❌ Item inválido:', item);
        return '';
      }
      
      let precio = 0;
      if (item.producto.en_promocion && item.producto.precio_promocion) {
        precio = parseFloat(item.producto.precio_promocion) || 0;
      } else {
        precio = parseFloat(item.producto.precio_normal) || 0;
      }
      
      const cantidad = parseInt(item.cantidad) || 1;
      const subtotal = precio * cantidad;
      
      return `
        <tr style="border-bottom: 1px solid #e8d5b5;">
          <td style="padding: 12px; text-align: left;">${cantidad}x ${item.producto.nombre || 'Producto'}</td>
          <td style="padding: 12px; text-align: right;">$${precio.toFixed(2)}</td>
          <td style="padding: 12px; text-align: right;">$${subtotal.toFixed(2)}</td>
        </tr>
      `;
    }).join('');

    const mailOptions = {
      from: '"Panadería Delicias" <esthalexboob06@gmail.com>',
      to: email,
      subject: `✅ Confirmación de compra - Orden #${orden?.id || 'N/A'}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              background-color: #f5f5f5;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              background: white;
              border-radius: 16px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #c49a6c 0%, #b3864d 100%);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 2rem;
            }
            .header p {
              margin: 10px 0 0;
              opacity: 0.9;
            }
            .content {
              padding: 30px;
            }
            .aviso {
              background: #e6f7e6;
              border: 2px solid #28a745;
              border-radius: 8px;
              padding: 20px;
              margin: 20px 0;
              color: #28a745;
              text-align: center;
            }
            .aviso p {
              margin: 5px 0;
              font-size: 1.1rem;
            }
            .aviso i {
              font-size: 2.5rem;
              display: block;
              margin-bottom: 10px;
            }
            .orden-info {
              background: #fff9f0;
              border-radius: 8px;
              padding: 20px;
              margin-bottom: 30px;
              border: 1px solid #e8d5b5;
            }
            .orden-info p {
              margin: 8px 0;
              color: #5a4a3a;
              font-size: 1rem;
            }
            .orden-info strong {
              color: #c49a6c;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th {
              background: #c49a6c;
              color: white;
              padding: 12px;
              text-align: left;
            }
            th:last-child {
              text-align: right;
            }
            td {
              padding: 12px;
              border-bottom: 1px solid #e8d5b5;
            }
            td:last-child {
              text-align: right;
            }
            .total {
              background: #fff9f0;
              padding: 20px;
              text-align: right;
              font-size: 1.3rem;
              border-radius: 8px;
              margin: 20px 0;
            }
            .total p {
              margin: 5px 0;
            }
            .total strong {
              color: #c49a6c;
            }
            .footer {
              background: #f5f5f5;
              padding: 20px;
              text-align: center;
              color: #666;
              font-size: 0.9rem;
            }
            .btn {
              display: inline-block;
              padding: 12px 30px;
              background: #c49a6c;
              color: white;
              text-decoration: none;
              border-radius: 50px;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🍞 Panadería Delicias</h1>
              <p>Pan artesanal desde 1985</p>
            </div>
            
            <div class="content">
              <h2 style="color: #5a4a3a; text-align: center;">¡Gracias por tu compra!</h2>
              
              <div class="aviso">
                <i>⏰</i>
                <p><strong>Recuerda pasar por tus productos</strong></p>
                <p>Tienes <strong>24 horas</strong> para recogerlos</p>
                <p>Te esperamos en nuestra sucursal</p>
              </div>
              
              <div class="orden-info">
                <p><strong>Orden:</strong> #${orden?.id || 'N/A'}</p>
                <p><strong>Fecha:</strong> ${orden?.fecha ? new Date(orden.fecha).toLocaleString('es-MX', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  year: 'numeric', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                }) : new Date().toLocaleString('es-MX')}</p>
                <p><strong>Método de pago:</strong> ${
                  orden?.metodoPago === 'efectivo' ? '💵 Efectivo' : 
                  orden?.metodoPago === 'transferencia' ? '🏦 Transferencia' : 
                  '💳 Tarjeta'
                }</p>
              </div>
              
              <h3 style="color: #5a4a3a;">Detalle de tu compra:</h3>
              
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Precio</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${listaProductos}
                </tbody>
              </table>
              
              <div class="total">
                <p><strong>Subtotal:</strong> $${orden?.subtotal ? orden.subtotal.toFixed(2) : '0.00'}</p>
                <p><strong>Envío:</strong> ${orden?.envio === 0 ? 'GRATIS' : '$' + (orden?.envio?.toFixed(2) || '50.00')}</p>
                <p style="font-size: 1.5rem;"><strong>TOTAL:</strong> $${orden?.total ? orden.total.toFixed(2) : '0.00'}</p>
              </div>
              
              <div style="text-align: center;">
                <a href="http://localhost:4200/menu" class="btn">Seguir comprando</a>
              </div>
            </div>
            
            <div class="footer">
              <p>📍 Calle Principal #123, Centro</p>
              <p>📞 Tel: (123) 456-7890</p>
              <p>🕒 Horario: Lunes a Sábado 8:00 - 20:00 | Domingo 9:00 - 14:00</p>
              <p style="margin-top: 15px;">© 2024 Panadería Delicias - Todos los derechos reservados</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Correo enviado:', info.messageId);
    
    res.json({
      success: true,
      message: 'Correo enviado exitosamente',
      messageId: info.messageId
    });

  } catch (error) {
    console.error('❌ Error enviando correo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al enviar el correo',
      error: error.message
    });
  }
};

// ===== NUEVA FUNCIÓN: GUARDAR ORDEN EN BASE DE DATOS =====
const guardarOrdenEnDB = async (req, res) => {
    try {
        const { orden, email, items } = req.body;
        
        console.log('💾 Guardando orden en base de datos:', orden.id);
        console.log('📅 Fecha original:', orden.fecha);
        
        // Convertir la fecha al formato que MySQL entiende (YYYY-MM-DD HH:MM:SS)
        const fechaMySQL = new Date(orden.fecha).toISOString().slice(0, 19).replace('T', ' ');
        console.log('📅 Fecha formateada para MySQL:', fechaMySQL);
        
        // Verificar si la tabla existe, si no, crearla
        await db.pool.execute(`
            CREATE TABLE IF NOT EXISTS ordenes_ventas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                orden_id VARCHAR(50) NOT NULL,
                fecha DATETIME NOT NULL,
                cliente_email VARCHAR(100),
                items JSON NOT NULL,
                subtotal DECIMAL(10,2) NOT NULL,
                envio DECIMAL(10,2) NOT NULL,
                total DECIMAL(10,2) NOT NULL,
                metodo_pago VARCHAR(50),
                estado VARCHAR(50) DEFAULT 'confirmado',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX (orden_id),
                INDEX (fecha)
            )
        `);

        // Asegurar que items sea un string JSON válido
        let itemsJSON;
        try {
            itemsJSON = JSON.stringify(items);
        } catch (e) {
            console.error('❌ Error al convertir items a JSON:', e);
            itemsJSON = '[]';
        }

        // Insertar la orden
        const [result] = await db.pool.execute(
            `INSERT INTO ordenes_ventas 
             (orden_id, fecha, cliente_email, items, subtotal, envio, total, metodo_pago, estado) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                orden.id,
                fechaMySQL,
                email || 'cliente@email.com',
                itemsJSON,
                orden.subtotal,
                orden.envio,
                orden.total,
                orden.metodoPago,
                orden.estado || 'confirmado'
            ]
        );
        
        console.log('✅ Orden guardada en base de datos, ID:', result.insertId);
        
        res.json({
            success: true,
            message: 'Orden guardada exitosamente',
            data: {
                insertId: result.insertId,
                ordenId: orden.id
            }
        });

    } catch (error) {
        console.error('❌ Error guardando orden en DB:', error);
        res.status(500).json({
            success: false,
            message: 'Error al guardar la orden en base de datos',
            error: error.message
        });
    }
};

// ===== NUEVA FUNCIÓN: OBTENER ÓRDENES (CORREGIDA CON MANEJO DE ERRORES JSON) =====
const obtenerOrdenes = async (req, res) => {
    try {
        const { limite = 100, email } = req.query;
        
        console.log('📋 Obteniendo órdenes, límite:', limite);
        
        let query = 'SELECT * FROM ordenes_ventas ORDER BY fecha DESC';
        let params = [];
        
        if (email) {
            query = 'SELECT * FROM ordenes_ventas WHERE cliente_email = ? ORDER BY fecha DESC';
            params = [email];
        }
        
        const [rows] = await db.pool.execute(query, params);
        
        // Limitar en JavaScript en lugar de SQL
        const rowsLimitadas = limite ? rows.slice(0, parseInt(limite)) : rows;
        
        // Parsear el JSON de items para cada orden con manejo de errores
        const ordenes = rowsLimitadas.map(row => {
            try {
                // Intentar parsear items
                let items = [];
                if (row.items) {
                    // Si ya es un objeto, usarlo directamente
                    if (typeof row.items === 'object') {
                        items = row.items;
                    } else {
                        // Si es string, intentar parsearlo
                        items = JSON.parse(row.items);
                    }
                }
                
                return {
                    ...row,
                    items: items
                };
            } catch (e) {
                console.error('❌ Error parseando items para orden:', row.orden_id, e.message);
                // Devolver la orden con items vacío en caso de error
                return {
                    ...row,
                    items: []
                };
            }
        });
        
        res.json({
            success: true,
            data: ordenes,
            total: ordenes.length
        });

    } catch (error) {
        console.error('❌ Error obteniendo órdenes:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener las órdenes',
            error: error.message
        });
    }
};

// ===== NUEVA FUNCIÓN: OBTENER ESTADÍSTICAS DE VENTAS =====
const obtenerEstadisticasVentas = async (req, res) => {
    try {
        // Ventas del día
        const [ventasHoy] = await db.pool.execute(`
            SELECT COUNT(*) as total_ordenes, SUM(total) as total_vendido
            FROM ordenes_ventas 
            WHERE DATE(fecha) = CURDATE()
        `);

        // Ventas de la semana
        const [ventasSemana] = await db.pool.execute(`
            SELECT COUNT(*) as total_ordenes, SUM(total) as total_vendido
            FROM ordenes_ventas 
            WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        `);

        // Ventas del mes
        const [ventasMes] = await db.pool.execute(`
            SELECT COUNT(*) as total_ordenes, SUM(total) as total_vendido
            FROM ordenes_ventas 
            WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        `);

        // Ventas del trimestre (3 meses)
        const [ventasTrimestre] = await db.pool.execute(`
            SELECT COUNT(*) as total_ordenes, SUM(total) as total_vendido
            FROM ordenes_ventas 
            WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
        `);

        // Ventas del semestre (6 meses)
        const [ventasSemestre] = await db.pool.execute(`
            SELECT COUNT(*) as total_ordenes, SUM(total) as total_vendido
            FROM ordenes_ventas 
            WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 180 DAY)
        `);

        // Ventas del año
        const [ventasAño] = await db.pool.execute(`
            SELECT COUNT(*) as total_ordenes, SUM(total) as total_vendido
            FROM ordenes_ventas 
            WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 365 DAY)
        `);

        // Total general
        const [totalGeneral] = await db.pool.execute(`
            SELECT COUNT(*) as total_ordenes, SUM(total) as total_vendido
            FROM ordenes_ventas
        `);

        res.json({
            success: true,
            data: {
                hoy: {
                    ordenes: ventasHoy[0].total_ordenes || 0,
                    total: ventasHoy[0].total_vendido || 0
                },
                semana: {
                    ordenes: ventasSemana[0].total_ordenes || 0,
                    total: ventasSemana[0].total_vendido || 0
                },
                mes: {
                    ordenes: ventasMes[0].total_ordenes || 0,
                    total: ventasMes[0].total_vendido || 0
                },
                trimestre: {
                    ordenes: ventasTrimestre[0].total_ordenes || 0,
                    total: ventasTrimestre[0].total_vendido || 0
                },
                semestre: {
                    ordenes: ventasSemestre[0].total_ordenes || 0,
                    total: ventasSemestre[0].total_vendido || 0
                },
                año: {
                    ordenes: ventasAño[0].total_ordenes || 0,
                    total: ventasAño[0].total_vendido || 0
                },
                total_general: {
                    ordenes: totalGeneral[0].total_ordenes || 0,
                    total: totalGeneral[0].total_vendido || 0
                }
            }
        });

    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas',
            error: error.message
        });
    }
};

// ===== NUEVA FUNCIÓN: OBTENER UNA ORDEN POR SU ID =====
const obtenerOrdenPorId = async (req, res) => {
    try {
        const { ordenId } = req.params;
        
        console.log(`🔍 Buscando orden: ${ordenId}`);
        
        const [rows] = await db.pool.execute(
            'SELECT * FROM ordenes_ventas WHERE orden_id = ?',
            [ordenId]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Orden no encontrada'
            });
        }
        
        // Parsear el JSON de items con manejo de errores
        let items = [];
        try {
            if (rows[0].items) {
                if (typeof rows[0].items === 'object') {
                    items = rows[0].items;
                } else {
                    items = JSON.parse(rows[0].items);
                }
            }
        } catch (e) {
            console.error('❌ Error parseando items:', e.message);
            items = [];
        }
        
        const orden = {
            ...rows[0],
            items: items
        };
        
        res.json({
            success: true,
            data: orden
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo orden:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener la orden',
            error: error.message
        });
    }
};

module.exports = {
    // Categorías
    obtenerCategorias,
    agregarCategoria,
    actualizarCategoria,
    eliminarCategoria,
    
    // Productos
    obtenerProductos,
    obtenerProductosPorCategoria,
    agregarProducto,
    actualizarProducto,
    eliminarProducto,
    reordenarProductos,
    obtenerDestacados,
    
    // Gestión de Stock
    descontarStockPorCompra,
    revertirStockPorCancelacion,
    ajustarStock,
    obtenerMovimientosStock,
    obtenerAlertasStock,
    
    // Correos
    enviarCorreoConfirmacion,
    
    // 📦 NUEVAS FUNCIONES PARA ÓRDENES EN BASE DE DATOS
    guardarOrdenEnDB,
    obtenerOrdenes,
    obtenerEstadisticasVentas,
    obtenerOrdenPorId
};