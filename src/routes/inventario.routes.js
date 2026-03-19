const express = require('express');
const router = express.Router();
const inventarioController = require('../controllers/inventario.controller');

// ============================================
// RUTAS DE INVENTARIO
// ============================================

// GET /api/inventario - Ver inventario actual
router.get('/', inventarioController.obtenerInventario);

// GET /api/inventario/movimientos - Historial de movimientos
router.get('/movimientos', inventarioController.obtenerMovimientos);

// POST /api/inventario/produccion - Registrar producción (entrada)
router.post('/produccion', inventarioController.registrarProduccion);

// POST /api/inventario/venta - Registrar venta (salida)
router.post('/venta', inventarioController.registrarVenta);

// PUT /api/inventario/ajustar - Ajustar stock manualmente
router.put('/ajustar', inventarioController.ajustarStock);

module.exports = router;