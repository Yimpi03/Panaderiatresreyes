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
const historiaRoutes = require('./routes/historia.routes');
const ofrecemosRoutes = require('./routes/ofrecemos.routes');
const menuRoutes = require('./routes/menu.routes');
const inventarioRoutes = require('./routes/inventario.routes');
const productosRoutes = require('./routes/productos.routes');

const app = express();

// 🔥 MIDDLEWARES

app.use(helmet());
app.use(compression());

// ✅ SOLUCIÓN REAL CORS (PRODUCCIÓN)
app.use(cors({
  origin: [
    'http://localhost:4200',
    'https://panaderiatresreyes.com'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));

// 🔥 RUTAS
app.use('/api/gallery', galleryRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/historia', historiaRoutes);
app.use('/api/ofrecemos', ofrecemosRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/productos', productosRoutes);

// 🔥 HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    database: process.env.DB_NAME,
    environment: process.env.NODE_ENV
  });
});

// 🔥 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada'
  });
});

// 🔥 ERRORES
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.stack : {}
  });
});

module.exports = app;