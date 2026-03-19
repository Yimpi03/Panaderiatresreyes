const express = require('express');
const router = express.Router();
const productosController = require('../controllers/productos.controller');

// ============================================
// RUTAS PARA PRODUCTOS
// ============================================

// GET /api/productos - Obtener todos los productos
router.get('/', productosController.obtenerProductos);

// GET /api/productos/:id - Obtener producto por ID
router.get('/:id', productosController.obtenerProductoPorId);

// POST /api/productos - Agregar nuevo producto
router.post('/', productosController.agregarProducto);

// PUT /api/productos/:id - Actualizar producto
router.put('/:id', productosController.actualizarProducto);

// DELETE /api/productos/:id - Eliminar producto
router.delete('/:id', productosController.eliminarProducto);

module.exports = router;