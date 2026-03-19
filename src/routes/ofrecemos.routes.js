const express = require('express');
const router = express.Router();
const ofrecemosController = require('../controllers/ofrecemos.controller');

// ============================================
// RUTAS PARA "LO QUE OFRECEMOS"
// ============================================

// GET /api/ofrecemos - Obtener todas las tarjetas
router.get('/', ofrecemosController.obtenerTarjetas);

// POST /api/ofrecemos - Agregar nueva tarjeta
router.post('/', ofrecemosController.agregarTarjeta);

// PUT /api/ofrecemos/:id - Actualizar tarjeta
router.put('/:id', ofrecemosController.actualizarTarjeta);

// DELETE /api/ofrecemos/:id - Eliminar tarjeta
router.delete('/:id', ofrecemosController.eliminarTarjeta);

// PUT /api/ofrecemos/:id/reordenar - Reordenar tarjeta
router.put('/:id/reordenar', ofrecemosController.reordenarTarjetas);

module.exports = router;