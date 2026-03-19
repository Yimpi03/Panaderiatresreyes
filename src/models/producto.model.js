const db = require('../config/db');

const Producto = {
  // Obtener todos los productos
  getAll: async () => {
    const [rows] = await db.pool.execute(
      'SELECT * FROM productos WHERE activo = 1 ORDER BY created_at DESC'
    );
    return rows;
  },

  // Obtener producto por ID
  getById: async (id) => {
    const [rows] = await db.pool.execute(
      'SELECT * FROM productos WHERE id = ? AND activo = 1',
      [id]
    );
    return rows[0];
  },

  // Crear producto
  create: async (producto) => {
    const { imagen, titulo, descripcion, precio, categoria } = producto;
    const [result] = await db.pool.execute(
      'INSERT INTO productos (imagen, titulo, descripcion, precio, categoria) VALUES (?, ?, ?, ?, ?)',
      [imagen, titulo, descripcion, precio, categoria]
    );
    return result.insertId;
  },

  // Actualizar producto
  update: async (id, producto) => {
    const { imagen, titulo, descripcion, precio, categoria } = producto;
    const [result] = await db.pool.execute(
      'UPDATE productos SET imagen = ?, titulo = ?, descripcion = ?, precio = ?, categoria = ? WHERE id = ?',
      [imagen, titulo, descripcion, precio, categoria, id]
    );
    return result.affectedRows;
  },

  // Eliminar producto (soft delete)
  delete: async (id) => {
    const [result] = await db.pool.execute(
      'UPDATE productos SET activo = 0 WHERE id = ?',
      [id]
    );
    return result.affectedRows;
  }
};

module.exports = Producto;