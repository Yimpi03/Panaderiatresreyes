const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menu.controller');
const db = require('../config/db');

// ============================================
// RUTAS PARA "MENÚ DE PRODUCTOS"
// ============================================

// ===== CATEGORÍAS =====
router.get('/categorias', menuController.obtenerCategorias);
router.post('/categorias', menuController.agregarCategoria);
router.put('/categorias/:id', menuController.actualizarCategoria);
router.delete('/categorias/:id', menuController.eliminarCategoria);

// ===== PRODUCTOS =====
router.get('/productos', menuController.obtenerProductos);
router.get('/productos/destacados', menuController.obtenerDestacados);
router.get('/productos/categoria/:categoriaId', menuController.obtenerProductosPorCategoria);
router.post('/productos', menuController.agregarProducto);
router.put('/productos/:id', menuController.actualizarProducto);
router.delete('/productos/:id', menuController.eliminarProducto);
router.put('/productos/:id/reordenar', menuController.reordenarProductos);

// ============================================
// 🆕 GESTIÓN DE STOCK
// ============================================

/**
 * 🛒 DESCONTAR STOCK POR COMPRA
 * Body: { items: [{ productoId, cantidad }], ordenId }
 */
router.post('/stock/descontar', menuController.descontarStockPorCompra);

/**
 * ↩️ REINTEGRAR STOCK POR CANCELACIÓN
 * Body: { items: [{ productoId, cantidad }], ordenId, motivo }
 */
router.post('/stock/reintegrar', menuController.revertirStockPorCancelacion);

/**
 * 🔧 AJUSTE MANUAL DE STOCK
 * Body: { productoId, nuevoStock, motivo }
 */
router.put('/stock/ajustar', menuController.ajustarStock);

/**
 * 📊 OBTENER MOVIMIENTOS DE STOCK (AUDITORÍA)
 * Query params: productoId, desde, hasta, tipo, limit
 */
router.get('/stock/movimientos', menuController.obtenerMovimientosStock);

/**
 * ⚠️ OBTENER ALERTAS DE STOCK
 * Productos agotados y con stock bajo
 */
router.get('/stock/alertas', menuController.obtenerAlertasStock);

/**
 * 📦 OBTENER STOCK DE UN PRODUCTO ESPECÍFICO
 */
router.get('/stock/producto/:productoId', async (req, res) => {
    try {
        const { productoId } = req.params;
        console.log(`🔍 Consultando stock para producto ID: ${productoId}`);
        
        const [rows] = await db.pool.execute(
            'SELECT id, nombre, stock_actual, stock_minimo, disponible FROM menu_productos WHERE id = ? AND is_active = TRUE',
            [productoId]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }
        
        res.json({
            success: true,
            data: rows[0]
        });
    } catch (error) {
        console.error('❌ Error al obtener stock:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error al obtener stock',
            error: error.message
        });
    }
});

/**
 * 📈 ESTADÍSTICAS DE STOCK
 */
router.get('/stock/estadisticas', async (req, res) => {
    try {
        // Total de productos en inventario
        const [total] = await db.pool.execute(
            'SELECT SUM(stock_actual) as total FROM menu_productos WHERE is_active = TRUE'
        );
        
        // Productos agotados
        const [agotados] = await db.pool.execute(
            'SELECT COUNT(*) as count FROM menu_productos WHERE is_active = TRUE AND stock_actual <= 0'
        );
        
        // Productos con stock bajo
        const [stockBajo] = await db.pool.execute(
            'SELECT COUNT(*) as count FROM menu_productos WHERE is_active = TRUE AND stock_actual > 0 AND stock_actual <= COALESCE(stock_minimo, 5)'
        );
        
        // Valor total del inventario
        const [valor] = await db.pool.execute(
            `SELECT SUM(
                CASE 
                    WHEN en_promocion = 1 AND precio_promocion > 0 
                    THEN precio_promocion * stock_actual 
                    ELSE precio_normal * stock_actual 
                END
            ) as valor_total 
            FROM menu_productos 
            WHERE is_active = TRUE`
        );
        
        res.json({
            success: true,
            data: {
                total_unidades: total[0].total || 0,
                productos_agotados: agotados[0].count,
                productos_stock_bajo: stockBajo[0].count,
                valor_total_inventario: valor[0].valor_total || 0
            }
        });
    } catch (error) {
        console.error('❌ Error al obtener estadísticas:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas',
            error: error.message
        });
    }
});

// ============================================
// ✉️ ENVÍO DE CORREOS
// ============================================

/**
 * 📧 ENVIAR CORREO DE CONFIRMACIÓN DE COMPRA
 * Body: { email, orden, items, total }
 */
router.post('/enviar-correo', menuController.enviarCorreoConfirmacion);

// ============================================
// 📦 RUTAS PARA ÓRDENES EN BASE DE DATOS
// ============================================

/**
 * 💾 GUARDAR ORDEN EN BASE DE DATOS
 * Body: { orden, email, items }
 */
router.post('/ordenes/guardar', menuController.guardarOrdenEnDB);

/**
 * 📋 OBTENER ÓRDENES (con filtros)
 * Query params: limite (default 100), email (opcional)
 */
router.get('/ordenes', menuController.obtenerOrdenes);

/**
 * 📊 ESTADÍSTICAS DE VENTAS
 * Ventas del día, semana, mes, trimestre, semestre, año
 */
router.get('/ordenes/estadisticas', menuController.obtenerEstadisticasVentas);

/**
 * 🔍 OBTENER UNA ORDEN POR SU ID
 * CORREGIDO: Ahora usa la función del controlador
 */
router.get('/ordenes/:ordenId', menuController.obtenerOrdenPorId);

/**
 * 📅 OBTENER ÓRDENES POR RANGO DE FECHAS
 * Query params: desde, hasta
 */
router.get('/ordenes/rango/fechas', async (req, res) => {
    try {
        const { desde, hasta } = req.query;
        
        if (!desde || !hasta) {
            return res.status(400).json({
                success: false,
                message: 'Se requieren las fechas desde y hasta'
            });
        }
        
        const [rows] = await db.pool.execute(
            'SELECT * FROM ordenes_ventas WHERE DATE(fecha) BETWEEN ? AND ? ORDER BY fecha DESC',
            [desde, hasta]
        );
        
        // Parsear items para cada orden
        const ordenes = rows.map(row => ({
            ...row,
            items: JSON.parse(row.items)
        }));
        
        res.json({
            success: true,
            data: ordenes,
            total: ordenes.length
        });
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error al obtener órdenes por fecha'
        });
    }
});

module.exports = router;