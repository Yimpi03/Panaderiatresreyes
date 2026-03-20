const db = require('../config/db');

// ============================================
// CONTROLADOR PARA PRODUCTOS (CORREGIDO)
// ============================================

// Obtener todos los productos
const obtenerProductos = async (req, res) => {
    try {
        console.log('📦 Obteniendo productos...');
        
        const [rows] = await db.pool.execute(
            'SELECT * FROM menu_productos WHERE activo = 1 ORDER BY created_at DESC'
        );
        
        console.log(`✅ ${rows.length} productos encontrados`);
        
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

// Obtener producto por ID
const obtenerProductoPorId = async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log(`🔍 Buscando producto ID: ${id}`);
        
        const [rows] = await db.pool.execute(
            'SELECT * FROM menu_productos WHERE id = ? AND activo = 1',
            [id]
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
        console.error('❌ Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error al obtener producto',
            error: error.message
        });
    }
};

// Agregar nuevo producto
const agregarProducto = async (req, res) => {
    try {
        const { imagen, titulo, descripcion, precio, categoria } = req.body;
        
        console.log('➕ Agregando producto:', titulo);
        
        if (!imagen || !titulo || !precio) {
            return res.status(400).json({
                success: false,
                message: 'Imagen, título y precio son requeridos'
            });
        }
        
        const [result] = await db.pool.execute(
            'INSERT INTO menu_productos (imagen, titulo, descripcion, precio, categoria) VALUES (?, ?, ?, ?, ?)',
            [imagen, titulo, descripcion || '', precio, categoria || 'General']
        );
        
        const [nuevoProducto] = await db.pool.execute(
            'SELECT * FROM menu_productos WHERE id = ?',
            [result.insertId]
        );
        
        const io = req.app.get('io');
        if (io) {
            io.emit('productos:nuevo', nuevoProducto[0]);
        }
        
        res.json({
            success: true,
            message: '✅ Producto agregado correctamente',
            data: nuevoProducto[0]
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error al agregar producto',
            error: error.message
        });
    }
};

// Actualizar producto
const actualizarProducto = async (req, res) => {
    try {
        const { id } = req.params;
        const { imagen, titulo, descripcion, precio, categoria } = req.body;
        
        console.log('✏️ Actualizando producto ID:', id);
        
        const [existente] = await db.pool.execute(
            'SELECT * FROM menu_productos WHERE id = ? AND activo = 1',
            [id]
        );
        
        if (existente.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }
        
        let query = 'UPDATE menu_productos SET ';
        const updates = [];
        const values = [];
        
        if (imagen !== undefined) {
            updates.push('imagen = ?');
            values.push(imagen);
        }
        if (titulo !== undefined) {
            updates.push('titulo = ?');
            values.push(titulo);
        }
        if (descripcion !== undefined) {
            updates.push('descripcion = ?');
            values.push(descripcion);
        }
        if (precio !== undefined) {
            updates.push('precio = ?');
            values.push(precio);
        }
        if (categoria !== undefined) {
            updates.push('categoria = ?');
            values.push(categoria);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No hay campos para actualizar'
            });
        }
        
        query += updates.join(', ') + ' WHERE id = ?';
        values.push(id);
        
        await db.pool.execute(query, values);
        
        const [productoActualizado] = await db.pool.execute(
            'SELECT * FROM menu_productos WHERE id = ?',
            [id]
        );
        
        const io = req.app.get('io');
        if (io) {
            io.emit('productos:actualizado', productoActualizado[0]);
        }
        
        res.json({
            success: true,
            message: '✅ Producto actualizado correctamente',
            data: productoActualizado[0]
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

// Eliminar producto (soft delete)
const eliminarProducto = async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('🗑️ Eliminando producto ID:', id);
        
        const [existente] = await db.pool.execute(
            'SELECT * FROM menu_productos WHERE id = ? AND activo = 1',
            [id]
        );
        
        if (existente.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Producto no encontrado'
            });
        }
        
        await db.pool.execute(
            'UPDATE menu_productos SET activo = 0 WHERE id = ?',
            [id]
        );
        
        const io = req.app.get('io');
        if (io) {
            io.emit('productos:eliminado', { id, titulo: existente[0].titulo });
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

module.exports = {
    obtenerProductos,
    obtenerProductoPorId,
    agregarProducto,
    actualizarProducto,
    eliminarProducto
};