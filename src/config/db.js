const mysql = require('mysql2/promise');
require('dotenv').config();

// Crear pool de conexiones con collation forzada
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '2025Elianadavid',
    database: process.env.DB_NAME || 'TRES_REYES',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',  // Forzar collation en la conexión
    timezone: 'Z',
    dateStrings: true,
    multipleStatements: false
});

// Probar la conexión
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Conexión a MySQL establecida correctamente');
        console.log(`📊 Base de datos: ${process.env.DB_NAME}`);
        
        // Verificar collation actual
        const [collationResult] = await connection.query('SELECT @@collation_connection as collation');
        console.log(`🔤 Collation de conexión: ${collationResult[0].collation}`);
        
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Error al conectar a MySQL:', error.message);
        return false;
    }
};

// Ejecutar consultas con logging en desarrollo
const query = async (sql, params = []) => {
    let connection;
    try {
        connection = await pool.getConnection();
        
        if (process.env.NODE_ENV === 'development') {
            console.log('📝 Query:', sql);
            console.log('📦 Params:', params);
        }
        
        const [results] = await connection.execute(sql, params);
        return results;
    } catch (error) {
        console.error('❌ Error en query:', error.message);
        throw error;
    } finally {
        if (connection) connection.release();
    }
};

// Ejecutar procedimientos almacenados
const executeProcedure = async (procedureName, params = []) => {
    let connection;
    try {
        connection = await pool.getConnection();
        
        const placeholders = params.map(() => '?').join(',');
        const sql = `CALL ${procedureName}(${placeholders})`;
        
        if (process.env.NODE_ENV === 'development') {
            console.log('📝 Procedimiento:', sql);
            console.log('📦 Params:', params);
        }
        
        const [results] = await connection.execute(sql, params);
        return results;
    } catch (error) {
        console.error('❌ Error en procedimiento:', error.message);
        throw error;
    } finally {
        if (connection) connection.release();
    }
};

// Transacciones
const beginTransaction = async () => {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    return connection;
};

// Commit transacción
const commitTransaction = async (connection) => {
    try {
        await connection.commit();
    } finally {
        connection.release();
    }
};

// Rollback transacción
const rollbackTransaction = async (connection) => {
    try {
        await connection.rollback();
    } finally {
        connection.release();
    }
};

// Consulta con paginación directa (sin procedimiento)
const queryWithPagination = async (table, conditions = {}, page = 1, pageSize = 20, orderBy = 'position_index') => {
    try {
        const offset = (page - 1) * pageSize;
        
        // Construir WHERE clause
        let whereClause = 'is_active = TRUE';
        const values = [];
        
        if (Object.keys(conditions).length > 0) {
            Object.entries(conditions).forEach(([key, value]) => {
                whereClause += ` AND ${key} = ?`;
                values.push(value);
            });
        }
        
        // Consulta principal
        const dataSql = `
            SELECT 
                id,
                photo_name,
                photo_url,
                file_size,
                file_type,
                position_index,
                created_at,
                CASE 
                    WHEN file_size < 1024 THEN CONCAT(file_size, ' B')
                    WHEN file_size < 1048576 THEN CONCAT(ROUND(file_size / 1024, 1), ' KB')
                    ELSE CONCAT(ROUND(file_size / 1048576, 1), ' MB')
                END AS file_size_formatted
            FROM ${table}
            WHERE ${whereClause}
            ORDER BY ${orderBy}
            LIMIT ? OFFSET ?
        `;
        
        const data = await query(dataSql, [...values, pageSize, offset]);
        
        // Consulta total
        const countSql = `SELECT COUNT(*) as total FROM ${table} WHERE ${whereClause}`;
        const totalResult = await query(countSql, values);
        const total = totalResult[0]?.total || 0;
        
        return {
            data,
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize)
            }
        };
    } catch (error) {
        console.error('❌ Error en queryWithPagination:', error.message);
        throw error;
    }
};

// Búsqueda simple sin problemas de collation
const searchPhotos = async (searchTerm, page = 1, pageSize = 20) => {
    try {
        const offset = (page - 1) * pageSize;
        
        if (!searchTerm || searchTerm.trim() === '') {
            // Si no hay búsqueda, devolver todo
            return await queryWithPagination('gallery_photos', {}, page, pageSize);
        }
        
        // Escapar el término de búsqueda para LIKE
        const escapedTerm = `%${searchTerm}%`;
        
        // Consulta con búsqueda usando COLLATE en la consulta
        const dataSql = `
            SELECT 
                id,
                photo_name,
                photo_url,
                file_size,
                file_type,
                position_index,
                created_at,
                CASE 
                    WHEN file_size < 1024 THEN CONCAT(file_size, ' B')
                    WHEN file_size < 1048576 THEN CONCAT(ROUND(file_size / 1024, 1), ' KB')
                    ELSE CONCAT(ROUND(file_size / 1048576, 1), ' MB')
                END AS file_size_formatted
            FROM gallery_photos
            WHERE is_active = TRUE
            AND photo_name LIKE ? COLLATE utf8mb4_unicode_ci
            ORDER BY position_index
            LIMIT ? OFFSET ?
        `;
        
        const data = await query(dataSql, [escapedTerm, pageSize, offset]);
        
        // Total para paginación
        const countSql = `
            SELECT COUNT(*) as total
            FROM gallery_photos
            WHERE is_active = TRUE
            AND photo_name LIKE ? COLLATE utf8mb4_unicode_ci
        `;
        
        const totalResult = await query(countSql, [escapedTerm]);
        const total = totalResult[0]?.total || 0;
        
        return {
            data,
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize)
            }
        };
    } catch (error) {
        console.error('❌ Error en searchPhotos:', error.message);
        throw error;
    }
};

// Ejecutar consulta raw (para casos especiales)
const rawQuery = async (sql, params = []) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const [results] = await connection.query(sql, params);
        return results;
    } catch (error) {
        console.error('❌ Error en rawQuery:', error.message);
        throw error;
    } finally {
        if (connection) connection.release();
    }
};

module.exports = {
    pool,
    query,
    executeProcedure,
    beginTransaction,
    commitTransaction,
    rollbackTransaction,
    testConnection,
    queryWithPagination,
    searchPhotos,
    rawQuery
};