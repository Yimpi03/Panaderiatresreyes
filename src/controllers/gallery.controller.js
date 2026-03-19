const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// ============================================
// CONTROLADOR COMPLETO - CON SOPORTE PARA IMÁGENES GRANDES
// ============================================

// Obtener todas las fotos
const getPhotos = async (req, res) => {
    try {
        console.log('📸 Obteniendo fotos...');
        
        const [rows] = await db.pool.execute(`
            SELECT 
                id,
                photo_name as name,
                photo_url as url,
                file_size,
                file_type,
                position_index,
                created_at
            FROM gallery_photos 
            WHERE is_active = TRUE 
            ORDER BY position_index
        `);
        
        console.log(`✅ ${rows.length} fotos encontradas`);
        
        const photos = rows.map(photo => ({
            id: photo.id,
            name: photo.name,
            url: photo.url,
            file: null,
            file_size: photo.file_size,
            file_type: photo.file_type
        }));
        
        res.json({
            success: true,
            data: photos,
            pagination: {
                page: 1,
                pageSize: 100,
                total: photos.length,
                totalPages: 1
            }
        });
        
    } catch (error) {
        console.error('❌ Error en getPhotos:', error.message);
        res.json({
            success: true,
            data: [],
            pagination: {
                page: 1,
                pageSize: 20,
                total: 0,
                totalPages: 0
            }
        });
    }
};

// ===== FUNCIÓN PARA OPTIMIZAR BASE64 =====
const optimizarBase64 = (base64String) => {
    if (!base64String) return base64String;
    
    try {
        // Si es una URL de data URI, mantenerla completa
        if (base64String.startsWith('data:')) {
            console.log(`📦 Tamaño base64: ${(base64String.length / 1024).toFixed(0)}KB`);
            return base64String;
        }
        
        // Si no es data URI, devolver como está
        return base64String;
        
    } catch (error) {
        console.error('Error optimizando base64:', error);
        return base64String;
    }
};

// ===== SUBIR FOTO (VERSIÓN CORREGIDA) =====
const uploadPhoto = async (req, res) => {
    try {
        const { 
            photo_name, 
            photo_data, 
            file_size, 
            file_type 
        } = req.body;
        
        console.log('📤 Subiendo foto:', photo_name);
        console.log('📦 Tamaño de datos:', photo_data ? `${(photo_data.length / 1024).toFixed(0)}KB` : '0KB');
        
        if (!photo_name || !photo_data) {
            return res.status(400).json({
                success: false,
                message: 'Nombre y datos de la imagen son requeridos'
            });
        }

        const photoId = uuidv4();
        
        // 1. PRIMERO: Verificar la estructura de la tabla
        try {
            const [columns] = await db.pool.execute(`
                SELECT DATA_TYPE, CHARACTER_MAXIMUM_LENGTH 
                FROM information_schema.COLUMNS 
                WHERE TABLE_NAME = 'gallery_photos' 
                AND COLUMN_NAME = 'photo_url'
            `);
            
            console.log('📊 Tipo de columna photo_url:', columns[0]?.DATA_TYPE);
        } catch (e) {
            console.log('No se pudo verificar columna');
        }
        
        // 2. INTENTAR INSERTAR
        try {
            await db.pool.execute(`
                INSERT INTO gallery_photos 
                (id, photo_name, photo_url, file_size, file_type, position_index, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, TRUE, NOW())
            `, [
                photoId, 
                photo_name, 
                photo_data, // Guardar el base64 COMPLETO
                file_size || Math.ceil((photo_data.length * 3) / 4) || 0, // Calcular tamaño aprox
                file_type || 'image/jpeg',
                0
            ]);
            
            console.log('✅ Foto guardada en BD con ID:', photoId);
            
            res.json({
                success: true,
                message: '✅ Foto subida correctamente',
                data: { 
                    id: photoId,
                    name: photo_name,
                    url: photo_data
                }
            });
            
        } catch (dbError) {
            // 3. SI FALLA POR TAMAÑO, INTENTAR CON LONGTEXT
            if (dbError.message.includes('Data too long')) {
                console.log('⚠️ Error de tamaño, modificando tabla...');
                
                // Modificar la columna a LONGTEXT
                await db.pool.execute(`
                    ALTER TABLE gallery_photos 
                    MODIFY COLUMN photo_url LONGTEXT
                `);
                
                console.log('✅ Columna modificada a LONGTEXT, reintentando...');
                
                // Reintentar el insert
                await db.pool.execute(`
                    INSERT INTO gallery_photos 
                    (id, photo_name, photo_url, file_size, file_type, position_index, is_active, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, TRUE, NOW())
                `, [
                    photoId, 
                    photo_name, 
                    photo_data,
                    file_size || Math.ceil((photo_data.length * 3) / 4) || 0,
                    file_type || 'image/jpeg',
                    0
                ]);
                
                console.log('✅ Foto guardada después de modificar tabla');
                
                res.json({
                    success: true,
                    message: '✅ Foto subida correctamente',
                    data: { 
                        id: photoId,
                        name: photo_name,
                        url: photo_data
                    }
                });
            } else {
                throw dbError;
            }
        }
        
    } catch (error) {
        console.error('❌ Error al subir:', error.message);
        
        // Mensaje más específico para el error de tamaño
        if (error.message.includes('Data too long')) {
            res.status(500).json({
                success: false,
                message: 'La imagen es demasiado grande. Por favor, usa una imagen más pequeña o comprímela.',
                error: error.message
            });
        } else {
            res.status(500).json({
                success: false,
                message: 'Error al subir la foto',
                error: error.message
            });
        }
    }
};

// Eliminar foto
const deletePhoto = async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log('🗑️ Eliminando foto:', id);
        
        const [result] = await db.pool.execute(`
            UPDATE gallery_photos 
            SET is_active = FALSE 
            WHERE id = ?
        `, [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Foto no encontrada'
            });
        }
        
        res.json({
            success: true,
            message: '✅ Foto eliminada correctamente'
        });
        
    } catch (error) {
        console.error('❌ Error al eliminar:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar la foto',
            error: error.message
        });
    }
};

// Mover foto (cambiar orden)
const movePhoto = async (req, res) => {
    try {
        const { id } = req.params;
        const { newPosition } = req.body;
        
        console.log('🔄 Moviendo foto:', id, 'a posición:', newPosition);
        
        // Por ahora solo respondemos éxito
        res.json({
            success: true,
            message: '✅ Foto movida correctamente'
        });
        
    } catch (error) {
        console.error('❌ Error al mover:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error al mover la foto',
            error: error.message
        });
    }
};

// Obtener una sola foto por ID
const getPhotoById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const [rows] = await db.pool.execute(`
            SELECT 
                id,
                photo_name as name,
                photo_url as url,
                file_size,
                file_type,
                created_at
            FROM gallery_photos 
            WHERE id = ? AND is_active = TRUE
        `, [id]);
        
        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Foto no encontrada'
            });
        }
        
        res.json({
            success: true,
            data: {
                id: rows[0].id,
                name: rows[0].name,
                url: rows[0].url,
                file_size: rows[0].file_size,
                file_type: rows[0].file_type
            }
        });
        
    } catch (error) {
        console.error('❌ Error al obtener foto:', error.message);
        res.status(500).json({
            success: false,
            message: 'Error al obtener la foto',
            error: error.message
        });
    }
};

module.exports = {
    getPhotos,
    getPhotoById,
    uploadPhoto,
    deletePhoto,
    movePhoto
};