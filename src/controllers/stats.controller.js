const db = require('../config/db');

// Obtener estadísticas generales
const getGeneralStats = async (req, res) => {
    try {
        const stats = await db.query('SELECT * FROM view_gallery_stats');
        
        res.json({
            success: true,
            data: stats[0] || {}
        });
    } catch (error) {
        console.error('Error en getGeneralStats:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas',
            error: error.message
        });
    }
};

// Obtener estadísticas diarias
const getDailyStats = async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        
        const stats = await db.query(
            `SELECT * FROM view_gallery_stats_daily 
             WHERE upload_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
             ORDER BY upload_date DESC`,
            [days]
        );
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error en getDailyStats:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas diarias',
            error: error.message
        });
    }
};

// Obtener estadísticas por tipo de archivo
const getTypeStats = async (req, res) => {
    try {
        const stats = await db.query('SELECT * FROM view_photos_by_type');
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error en getTypeStats:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas por tipo',
            error: error.message
        });
    }
};

// Obtener estadísticas por usuario
const getUserStats = async (req, res) => {
    try {
        const results = await db.executeProcedure('sp_get_user_stats', []);
        
        res.json({
            success: true,
            data: results[0] || []
        });
    } catch (error) {
        console.error('Error en getUserStats:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas por usuario',
            error: error.message
        });
    }
};

// Obtener galería completa como JSON
const getGalleryJSON = async (req, res) => {
    try {
        const results = await db.query('SELECT fn_get_gallery_json() as gallery');
        
        const gallery = results[0]?.gallery || { total: 0, photos: [] };
        
        res.json({
            success: true,
            data: gallery
        });
    } catch (error) {
        console.error('Error en getGalleryJSON:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener galería como JSON',
            error: error.message
        });
    }
};

module.exports = {
    getGeneralStats,
    getDailyStats,
    getTypeStats,
    getUserStats,
    getGalleryJSON
};