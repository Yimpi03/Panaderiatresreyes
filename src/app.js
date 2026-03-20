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

// 🔥 SEGURIDAD Y PERFORMANCE
app.use(helmet());
app.use(compression());
app.use(morgan('dev'));

// 🔥 🔥 CORS PERFECTO (AQUÍ ESTABA EL PROBLEMA)
const allowedOrigins = [
  'http://localhost:4200',
  'https://panaderiatresreyes.com',
  'https://www.panaderiatresreyes.com'
];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (Postman, etc)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn('❌ CORS bloqueado:', origin);
      callback(null, false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// 🔥 BODY (IMPORTANTE PARA IMÁGENES GRANDES)
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

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
    environment: process.env.NODE_ENV || 'production'
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
    message: err.message || 'Error interno del servidor'
  });
});

module.exports = app;