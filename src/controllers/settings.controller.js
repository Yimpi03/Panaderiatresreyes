const db = require('../config/db');

// Obtener todas las configuraciones
const getSettings = async (req, res) => {
    try {
        const settings = await db.query(
            'SELECT setting_key, setting_value, setting_type FROM gallery_settings ORDER BY setting_key'
        );
        
        // Convertir según tipo
        const formattedSettings = {};
        settings.forEach(setting => {
            let value = setting.setting_value;
            
            if (setting.setting_type === 'number') {
                value = parseFloat(value);
            } else if (setting.setting_type === 'boolean') {
                value = value === 'true';
            } else if (setting.setting_type === 'json') {
                try {
                    value = JSON.parse(value);
                } catch (e) {
                    // Si no es JSON válido, dejar como string
                }
            }
            
            formattedSettings[setting.setting_key] = value;
        });
        
        res.json({
            success: true,
            data: formattedSettings
        });
    } catch (error) {
        console.error('Error en getSettings:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener configuraciones',
            error: error.message
        });
    }
};

// Actualizar configuración
const updateSetting = async (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;
        
        // Determinar tipo automáticamente
        let settingType = 'string';
        let settingValue = String(value);
        
        if (typeof value === 'number') {
            settingType = 'number';
        } else if (typeof value === 'boolean') {
            settingType = 'boolean';
        } else if (typeof value === 'object') {
            settingType = 'json';
            settingValue = JSON.stringify(value);
        }
        
        await db.query(
            `INSERT INTO gallery_settings (setting_key, setting_value, setting_type, description)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             setting_value = VALUES(setting_value),
             setting_type = VALUES(setting_type),
             updated_at = CURRENT_TIMESTAMP`,
            [key, settingValue, settingType, `Configuración ${key}`]
        );
        
        res.json({
            success: true,
            message: 'Configuración actualizada correctamente'
        });
    } catch (error) {
        console.error('Error en updateSetting:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar configuración',
            error: error.message
        });
    }
};

module.exports = {
    getSettings,
    updateSetting
};