const mysql = require('mysql2/promise');
require('dotenv').config();

async function testReal() {
    console.log('🔍 INICIANDO PRUEBA REAL...');
    console.log('=================================');
    
    let connection;
    
    try {
        // 1. Conectar directamente a MySQL
        console.log('1️⃣ Conectando a MySQL...');
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '2025Elianadavid',
            database: 'TRES_REYES'
        });
        
        console.log('✅ Conexión exitosa!');
        console.log('');
        
        // 2. Verificar collation actual
        console.log('2️⃣ Verificando collation...');
        const [collation] = await connection.execute('SELECT @@collation_connection as collation');
        console.log('   Collation conexión:', collation[0].collation);
        console.log('');
        
        // 3. Verificar tablas
        console.log('3️⃣ Verificando tablas...');
        const [tables] = await connection.execute('SHOW TABLES');
        console.log('   Tablas encontradas:');
        tables.forEach(table => {
            console.log('   - ' + Object.values(table)[0]);
        });
        console.log('');
        
        // 4. Insertar una foto de prueba REAL
        console.log('4️⃣ Insertando foto de prueba...');
        
        const testId = 'test_' + Date.now();
        const testName = 'foto_prueba.jpg';
        const testUrl = 'https://via.placeholder.com/150';
        
        await connection.execute(`
            INSERT INTO gallery_photos 
            (id, photo_name, photo_url, file_size, file_type, position_index, is_active)
            VALUES (?, ?, ?, 1024, 'image/jpeg', 0, TRUE)
        `, [testId, testName, testUrl]);
        
        console.log('✅ Foto insertada con ID:', testId);
        console.log('');
        
        // 5. Leer las fotos
        console.log('5️⃣ Leyendo fotos de la base de datos...');
        const [photos] = await connection.execute(`
            SELECT id, photo_name, photo_url, position_index 
            FROM gallery_photos 
            WHERE is_active = TRUE 
            ORDER BY position_index
        `);
        
        console.log(`   📸 ${photos.length} fotos encontradas:`);
        photos.forEach(photo => {
            console.log(`   - ${photo.photo_name} (${photo.id})`);
        });
        console.log('');
        
        // 6. Probar búsqueda
        console.log('6️⃣ Probando búsqueda...');
        const [search] = await connection.execute(`
            SELECT id, photo_name 
            FROM gallery_photos 
            WHERE is_active = TRUE 
            AND photo_name LIKE ?
        `, ['%prueba%']);
        
        console.log(`   🔍 Búsqueda "prueba": ${search.length} resultados`);
        console.log('');
        
        // 7. Limpiar - eliminar foto de prueba
        console.log('7️⃣ Limpiando datos de prueba...');
        await connection.execute('DELETE FROM gallery_photos WHERE id LIKE ?', ['test_%']);
        console.log('✅ Datos de prueba eliminados');
        console.log('');
        
        console.log('=================================');
        console.log('🎉 PRUEBA COMPLETADA CON ÉXITO!');
        console.log('✅ La base de datos funciona correctamente');
        
    } catch (error) {
        console.error('❌ ERROR EN PRUEBA:', error.message);
        console.error(error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Conexión cerrada');
        }
    }
}

testReal();