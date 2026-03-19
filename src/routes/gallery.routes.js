const express = require('express');
const router = express.Router();
const galleryController = require('../controllers/gallery.controller');

// ============================================
// RUTAS SIMPLIFICADAS QUE SÍ FUNCIONAN
// ============================================

// GET /api/gallery - Listar todas las fotos
router.get('/', galleryController.getPhotos);

// POST /api/gallery - Subir una foto
router.post('/', galleryController.uploadPhoto);

// DELETE /api/gallery/:id - Eliminar una foto
router.delete('/:id', galleryController.deletePhoto);

// PUT /api/gallery/:id/move - Mover una foto
router.put('/:id/move', galleryController.movePhoto);

module.exports = router;