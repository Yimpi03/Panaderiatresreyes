const express = require('express');
const router = express.Router();
const historiaController = require('../controllers/historia.controller');

// ============================================
// RUTAS PARA "NUESTRA HISTORIA"
// ============================================

// GET /api/historia - Obtener contenido actual
router.get('/', historiaController.getHistoriaActual);

// POST /api/historia - Guardar nuevo contenido
router.post('/', historiaController.guardarHistoria);

// GET /api/historia/versiones - Obtener historial de versiones
router.get('/versiones', historiaController.getHistorialVersiones);

// POST /api/historia/restaurar/:id - Restaurar versión anterior
router.post('/restaurar/:id', historiaController.restaurarVersion);

// DELETE /api/historia/versiones/:id - Eliminar versión permanentemente
router.delete('/versiones/:id', historiaController.eliminarVersionPermanente);

module.exports = router;