const db = require('../config/db');

// ============================================
// CONTROLADOR PARA "NUESTRA HISTORIA"
// ============================================

// Obtener contenido actual
const getHistoriaActual = async (req, res) => {
    try {
        console.log('📖 Obteniendo contenido de historia...');
        
        // Verificar primero si la tabla existe
        const [tablaExiste] = await db.pool.execute(`
            SHOW TABLES LIKE 'historia_contenido'
        `);
        
        if (tablaExiste.length === 0) {
            console.log('⚠️ La tabla historia_contenido no existe');
            return res.json({
                success: true,
                data: {
                    titulo_principal: '',        // ← VACÍO
                    subtitulo_historia: '',       // ← VACÍO
                    contenido_historia: '',       // ← VACÍO
                    subtitulo_mision: '',          // ← VACÍO
                    contenido_mision: '',          // ← VACÍO
                    subtitulo_vision: '',          // ← VACÍO
                    contenido_vision: '',          // ← VACÍO
                    version: 1,
                    ultima_actualizacion: new Date().toLocaleString()
                }
            });
        }
        
        // Verificar las columnas de la tabla
        const [columnas] = await db.pool.execute(`
            SHOW COLUMNS FROM historia_contenido
        `);
        
        console.log('📊 Columnas en la tabla:', columnas.map(c => c.Field).join(', '));
        
        // Determinar el nombre correcto de la columna de fecha
        let fechaColumn = 'fecha_creacion';
        if (columnas.some(c => c.Field === 'created_at')) {
            fechaColumn = 'created_at';
        }
        
        console.log(`📅 Usando columna de fecha: ${fechaColumn}`);
        
        const [rows] = await db.pool.execute(`
            SELECT 
                titulo_principal,
                subtitulo_historia,
                contenido_historia,
                subtitulo_mision,
                contenido_mision,
                subtitulo_vision,
                contenido_vision,
                version,
                DATE_FORMAT(${fechaColumn}, '%d/%m/%Y %H:%i') as ultima_actualizacion
            FROM historia_contenido 
            WHERE is_active = TRUE
        `);
        
        if (rows.length > 0) {
            console.log('✅ Contenido encontrado - Versión', rows[0].version);
            res.json({
                success: true,
                data: rows[0]
            });
        } else {
            console.log('⚠️ No hay contenido activo, devolviendo campos vacíos');
            
            // Verificar si hay alguna versión en la tabla
            const [totalVersiones] = await db.pool.execute(`
                SELECT COUNT(*) as total FROM historia_contenido
            `);
            
            if (totalVersiones[0].total > 0) {
                // Si hay versiones pero ninguna activa, activar la más reciente
                console.log('🔄 Activando la versión más reciente...');
                await db.pool.execute(`
                    UPDATE historia_contenido 
                    SET is_active = TRUE 
                    ORDER BY ${fechaColumn} DESC 
                    LIMIT 1
                `);
                
                // Recargar
                const [nuevasRows] = await db.pool.execute(`
                    SELECT 
                        titulo_principal,
                        subtitulo_historia,
                        contenido_historia,
                        subtitulo_mision,
                        contenido_mision,
                        subtitulo_vision,
                        contenido_vision,
                        version,
                        DATE_FORMAT(${fechaColumn}, '%d/%m/%Y %H:%i') as ultima_actualizacion
                    FROM historia_contenido 
                    WHERE is_active = TRUE
                `);
                
                return res.json({
                    success: true,
                    data: nuevasRows[0]
                });
            }
            
            // NO HAY DATOS - DEVOLVER TODO VACÍO
            res.json({
                success: true,
                data: {
                    titulo_principal: '',        // ← VACÍO
                    subtitulo_historia: '',       // ← VACÍO
                    contenido_historia: '',       // ← VACÍO
                    subtitulo_mision: '',          // ← VACÍO
                    contenido_mision: '',          // ← VACÍO
                    subtitulo_vision: '',          // ← VACÍO
                    contenido_vision: '',          // ← VACÍO
                    version: 1,
                    ultima_actualizacion: new Date().toLocaleString()
                }
            });
        }
        
    } catch (error) {
        console.error('❌ Error al obtener historia:', error.message);
        console.error('📝 Stack:', error.stack);
        
        // EN CASO DE ERROR, DEVOLVER VACÍO
        res.status(200).json({
            success: true,
            data: {
                titulo_principal: '',        // ← VACÍO
                subtitulo_historia: '',       // ← VACÍO
                contenido_historia: '',       // ← VACÍO
                subtitulo_mision: '',          // ← VACÍO
                contenido_mision: '',          // ← VACÍO
                subtitulo_vision: '',          // ← VACÍO
                contenido_vision: '',          // ← VACÍO
                version: 1,
                ultima_actualizacion: new Date().toLocaleString()
            }
        });
    }
};

// Guardar nuevo contenido
const guardarHistoria = async (req, res) => {
    try {
        const {
            titulo_principal,
            subtitulo_historia,
            contenido_historia,
            subtitulo_mision,
            contenido_mision,
            subtitulo_vision,
            contenido_vision
        } = req.body;

        console.log('💾 Guardando nueva versión de historia...');
        
        if (!titulo_principal) {
            return res.status(400).json({
                success: false,
                message: 'El título principal es requerido'
            });
        }

        // Verificar las columnas de la tabla
        const [columnas] = await db.pool.execute(`
            SHOW COLUMNS FROM historia_contenido
        `);
        
        // Determinar el nombre correcto de la columna de fecha
        let fechaColumn = 'fecha_creacion';
        if (columnas.some(c => c.Field === 'created_at')) {
            fechaColumn = 'created_at';
        }

        // Desactivar la versión actual
        await db.pool.execute(`
            UPDATE historia_contenido 
            SET is_active = FALSE 
            WHERE is_active = TRUE
        `);

        // Obtener el último número de versión
        const [ultimaVersion] = await db.pool.execute(`
            SELECT MAX(version) as max_version 
            FROM historia_contenido 
            WHERE is_active = FALSE
        `);
        
        const nuevaVersion = (ultimaVersion[0].max_version || 0) + 1;

        // Insertar nueva versión (SIN VALORES POR DEFECTO)
        const [result] = await db.pool.execute(`
            INSERT INTO historia_contenido (
                titulo_principal,
                subtitulo_historia,
                contenido_historia,
                subtitulo_mision,
                contenido_mision,
                subtitulo_vision,
                contenido_vision,
                version,
                is_active,
                creado_por,
                ${fechaColumn}
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?, NOW())
        `, [
            titulo_principal,           // ← SIN VALOR POR DEFECTO
            subtitulo_historia,          // ← SIN VALOR POR DEFECTO
            contenido_historia,          // ← SIN VALOR POR DEFECTO
            subtitulo_mision,             // ← SIN VALOR POR DEFECTO
            contenido_mision,             // ← SIN VALOR POR DEFECTO
            subtitulo_vision,             // ← SIN VALOR POR DEFECTO
            contenido_vision,             // ← SIN VALOR POR DEFECTO
            nuevaVersion,
            req.user?.id || 'sistema'
        ]);

        console.log('✅ Historia guardada correctamente como versión', nuevaVersion);
        
        // Obtener el contenido actualizado
        const [nuevoContenido] = await db.pool.execute(`
            SELECT 
                titulo_principal,
                subtitulo_historia,
                contenido_historia,
                subtitulo_mision,
                contenido_mision,
                subtitulo_vision,
                contenido_vision,
                version,
                DATE_FORMAT(${fechaColumn}, '%d/%m/%Y %H:%i') as ultima_actualizacion
            FROM historia_contenido 
            WHERE is_active = TRUE
        `);

        res.json({
            success: true,
            message: 'Contenido guardado correctamente',
            data: nuevoContenido[0] || null
        });

    } catch (error) {
        console.error('❌ Error al guardar historia:', error.message);
        console.error('📝 Stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Error al guardar el contenido',
            error: error.message
        });
    }
};

// Obtener historial de versiones
const getHistorialVersiones = async (req, res) => {
    try {
        console.log('📋 Obteniendo historial de versiones...');
        
        // Verificar las columnas de la tabla
        const [columnas] = await db.pool.execute(`
            SHOW COLUMNS FROM historia_contenido
        `);
        
        // Determinar el nombre correcto de la columna de fecha
        let fechaColumn = 'fecha_creacion';
        if (columnas.some(c => c.Field === 'created_at')) {
            fechaColumn = 'created_at';
        }
        
        const [versiones] = await db.pool.execute(`
            SELECT 
                id,
                version,
                titulo_principal,
                DATE_FORMAT(${fechaColumn}, '%d/%m/%Y %H:%i') as fecha,
                CASE 
                    WHEN is_active = 1 THEN 'Activo'
                    ELSE 'Histórico'
                END as estado
            FROM historia_contenido 
            ORDER BY 
                is_active DESC,
                ${fechaColumn} DESC
        `);
        
        console.log(`✅ ${versiones.length} versiones encontradas`);
        
        res.json({
            success: true,
            data: versiones
        });

    } catch (error) {
        console.error('❌ Error al obtener historial:', error.message);
        console.error('📝 Stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el historial',
            error: error.message
        });
    }
};

// Restaurar una versión anterior por ID
const restaurarVersion = async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log(`🔄 Restaurando versión ID: ${id}`);
        
        // Verificar las columnas de la tabla
        const [columnas] = await db.pool.execute(`
            SHOW COLUMNS FROM historia_contenido
        `);
        
        let fechaColumn = 'fecha_creacion';
        if (columnas.some(c => c.Field === 'created_at')) {
            fechaColumn = 'created_at';
        }
        
        // Obtener la versión a restaurar
        const [versionRows] = await db.pool.execute(`
            SELECT 
                titulo_principal,
                subtitulo_historia,
                contenido_historia,
                subtitulo_mision,
                contenido_mision,
                subtitulo_vision,
                contenido_vision
            FROM historia_contenido 
            WHERE id = ? AND is_active = FALSE
        `, [id]);
        
        if (versionRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Versión no encontrada'
            });
        }
        
        const version = versionRows[0];
        
        // Desactivar la versión actual
        await db.pool.execute(`
            UPDATE historia_contenido 
            SET is_active = FALSE 
            WHERE is_active = TRUE
        `);
        
        // Obtener el último número de versión
        const [ultimaVersion] = await db.pool.execute(`
            SELECT MAX(version) as max_version 
            FROM historia_contenido 
            WHERE is_active = FALSE
        `);
        
        const nuevaVersion = (ultimaVersion[0].max_version || 0) + 1;
        
        // Insertar la versión restaurada como nueva versión activa
        await db.pool.execute(`
            INSERT INTO historia_contenido (
                titulo_principal,
                subtitulo_historia,
                contenido_historia,
                subtitulo_mision,
                contenido_mision,
                subtitulo_vision,
                contenido_vision,
                version,
                is_active,
                creado_por,
                ${fechaColumn}
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?, NOW())
        `, [
            version.titulo_principal,
            version.subtitulo_historia,
            version.contenido_historia,
            version.subtitulo_mision,
            version.contenido_mision,
            version.subtitulo_vision,
            version.contenido_vision,
            nuevaVersion,
            req.user?.id || 'sistema'
        ]);
        
        console.log('✅ Versión restaurada correctamente como versión', nuevaVersion);
        
        res.json({
            success: true,
            message: 'Versión restaurada correctamente'
        });

    } catch (error) {
        console.error('❌ Error al restaurar versión:', error.message);
        console.error('📝 Stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Error al restaurar la versión',
            error: error.message
        });
    }
};

// Eliminar versión permanentemente
const eliminarVersionPermanente = async (req, res) => {
    try {
        const { id } = req.params;
        
        console.log(`🗑️ Eliminando versión ID: ${id} permanentemente...`);
        
        // Verificar las columnas de la tabla
        const [columnas] = await db.pool.execute(`
            SHOW COLUMNS FROM historia_contenido
        `);
        
        let fechaColumn = 'fecha_creacion';
        if (columnas.some(c => c.Field === 'created_at')) {
            fechaColumn = 'created_at';
        }
        
        // Verificar si la versión existe
        const [versionRows] = await db.pool.execute(`
            SELECT id, is_active FROM historia_contenido WHERE id = ?
        `, [id]);
        
        if (versionRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Versión no encontrada'
            });
        }
        
        const version = versionRows[0];
        
        if (version.is_active === 1) {
            return res.status(400).json({
                success: false,
                message: 'No se puede eliminar la versión activa actual'
            });
        }
        
        // Ejecutar eliminación física
        const [result] = await db.pool.execute(`
            DELETE FROM historia_contenido WHERE id = ? AND is_active = FALSE
        `, [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'No se pudo eliminar la versión'
            });
        }
        
        console.log(`✅ Versión ID: ${id} eliminada permanentemente`);
        
        // REACOMODAR VERSIONES DESPUÉS DE ELIMINAR
        console.log('🔄 Iniciando reacomodo de versiones...');
        
        // Obtener todas las versiones NO activas ordenadas por fecha (más antigua primero)
        const [versiones] = await db.pool.execute(`
            SELECT id 
            FROM historia_contenido 
            WHERE is_active = FALSE 
            ORDER BY ${fechaColumn} ASC
        `);
        
        console.log(`📊 Versiones a reacomodar: ${versiones.length}`);
        
        // Reasignar números de versión empezando desde 1
        for (let i = 0; i < versiones.length; i++) {
            const nuevoNumero = i + 1;
            const versionId = versiones[i].id;
            
            await db.pool.execute(`
                UPDATE historia_contenido 
                SET version = ? 
                WHERE id = ?
            `, [nuevoNumero, versionId]);
            
            console.log(`  ↪ Versión ID ${versionId} ahora es versión ${nuevoNumero}`);
        }
        
        console.log(`✅ Versiones reacomodadas: ${versiones.length} versiones actualizadas`);
        
        // Obtener la versión activa actual
        const [activa] = await db.pool.execute(`
            SELECT version FROM historia_contenido WHERE is_active = TRUE
        `);
        
        const versionActiva = activa.length > 0 ? activa[0].version : 1;
        
        res.json({
            success: true,
            message: 'Versión eliminada permanentemente y números reacomodados',
            data: { 
                id_eliminado: id,
                version_actual: versionActiva
            }
        });

    } catch (error) {
        console.error('❌ Error al eliminar versión:', error.message);
        console.error('📝 Stack:', error.stack);
        res.status(500).json({
            success: false,
            message: 'Error al eliminar la versión',
            error: error.message
        });
    }
};

// ============ EXPORTAR TODAS LAS FUNCIONES ============
module.exports = {
    getHistoriaActual,
    guardarHistoria,
    getHistorialVersiones,
    restaurarVersion,
    eliminarVersionPermanente
};