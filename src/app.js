const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

// Importar rutas
const galleryRoutes = require('./routes/gallery.routes');
const settingsRoutes = require('./routes/settings.routes');
const statsRoutes = require('./routes/stats.routes');
const historiaRoutes = require('./routes/historia.routes'); // 👈 NUEVA LÍNEA AÑADIDA
const ofrecemosRoutes = require('./routes/ofrecemos.routes');
const menuRoutes = require('./routes/menu.routes');
const inventarioRoutes = require('./routes/inventario.routes');
const productosRoutes = require('./routes/productos.routes'); // 👈 NUEVA LÍNEA



const app = express();

// Middlewares
app.use(helmet()); // Seguridad
app.use(compression()); // Compresión
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
    credentials: true
}));
app.use(express.json({ limit: '50mb' })); // Para base64 de imágenes
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev')); // Logging

// Rutas
app.use('/api/gallery', galleryRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/historia', historiaRoutes); // 👈 NUEVA LÍNEA AÑADIDA
app.use('/api/ofrecemos', ofrecemosRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/productos', productosRoutes); // 👈 NUEVA LÍNEA



// Ruta de prueba
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date(),
        database: process.env.DB_NAME,
        environment: process.env.NODE_ENV
    });
});

// Manejo de errores 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
    });
});

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.stack);
    
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? err.stack : {}
    });
});

module.exports = app;