const db = require('../config/db');

// ============================================
// CONTROLADOR PARA "LO QUE OFRECEMOS"
// ============================================

// Obtener todas las tarjetas
const obtenerTarjetas = async (req, res) => {
    try {
        console.log('📦 Obteniendo tarjetas...');
        
        const [rows] = await db.pool.execute('CALL sp_obtener_tarjetas()');
        const tarjetas = rows[0] || [];
        
        console.log(`✅ ${tarjetas.length} tarjetas encontradas`);
        
        res.json({
            success: true,
            data: tarjetas
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error al obtener tarjetas',
            error: error.message
        });
    }
};

// Agregar nueva tarjeta
const agregarTarjeta = async (req, res) => {
    try {
        const { imagen, titulo, descripcion, categoria, enlace } = req.body;
        
        console.log('➕ Agregando tarjeta:', titulo);
        
        // Validar campos requeridos
        if (!imagen || !titulo) {
            return res.status(400).json({
                success: false,
                message: 'Imagen y título son requeridos'
            });
        }
        
        const [result] = await db.pool.execute(
            'CALL sp_agregar_tarjeta(?, ?, ?, ?, ?, ?)',
            [
                imagen,
                titulo,
                descripcion || '',
                categoria || 'General',
                enlace || '',
                req.user?.id || 'sistema'
            ]
        );
        
        // Obtener la tarjeta recién creada
        const [nuevaTarjeta] = await db.pool.execute(
            'SELECT * FROM view_ofrecemos_tarjetas WHERE id = ?',
            [result[0][0].nuevo_id]
        );
        
        res.json({
            success: true,
            message: '✅ Tarjeta agregada correctamente',
            data: nuevaTarjeta[0] || null
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error al agregar tarjeta',
            error: error.message
        });
    }
};

// Actualizar tarjeta
const actualizarTarjeta = async (req, res) => {
    try {
        const { id } = req.params;
        const { imagen, titulo, descripcion, categoria, enlace } = req.body;
        
        console.log('✏️ Actualizando tarjeta ID:', id);
        
        const [result] = await db.pool.execute(
            'CALL sp_actualizar_tarjeta(?, ?, ?, ?, ?, ?, ?)',
            [
                id,
                imagen,
                titulo,
                descripcion || '',
                categoria || 'General',
                enlace || '',
                req.user?.id || 'sistema'
            ]
        );
        
        if (result[0][0].actualizadas === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tarjeta no encontrada'
            });
        }
        
        // Obtener tarjeta actualizada
        const [tarjetaActualizada] = await db.pool.execute(
            'SELECT * FROM view_ofrecemos_tarjetas WHERE id = ?',
            [id]
        );
        
        res.json({
            success: true,
            message: '✅ Tarjeta actualizada correctamente',
            data: tarjetaActualizada[0] || null
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar tarjeta',
            error: error.message
        });
    }
};

// Eliminar tarjeta
const eliminarTarjeta = async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('🗑️ Eliminando tarjeta ID:', id);
        
        const [result] = await db.pool.execute(
            'CALL sp_eliminar_tarjeta(?, ?)',
            [id, req.user?.id || 'sistema']
        );
        
        if (result[0][0].eliminadas === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tarjeta no encontrada'
            });
        }
        
        res.json({
            success: true,
            message: '✅ Tarjeta eliminada correctamente'
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar tarjeta',
            error: error.message
        });
    }
};

// Reordenar tarjetas
const reordenarTarjetas = async (req, res) => {
    try {
        const { id } = req.params;
        const { nuevaPosicion } = req.body;
        
        console.log('🔄 Reordenando tarjeta ID:', id, 'a posición:', nuevaPosicion);
        
        await db.pool.execute(
            'CALL sp_reordenar_tarjetas(?, ?, ?)',
            [id, nuevaPosicion, req.user?.id || 'sistema']
        );
        
        // Obtener todas las tarjetas con nuevo orden
        const [rows] = await db.pool.execute('CALL sp_obtener_tarjetas()');
        
        res.json({
            success: true,
            message: '✅ Tarjetas reordenadas correctamente',
            data: rows[0] || []
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error al reordenar tarjetas',
            error: error.message
        });
    }
};

module.exports = {
    obtenerTarjetas,
    agregarTarjeta,
    actualizarTarjeta,
    eliminarTarjeta,
    reordenarTarjetas
};