const app = require('./app');
const http = require('http');
const socketIO = require('socket.io');
const { testConnection } = require('./config/db');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

// Crear servidor HTTP a partir de Express
const server = http.createServer(app);

// Configurar Socket.IO
const io = socketIO(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Hacer io accesible desde las rutas
app.set('io', io);

// Configuración de Socket.IO
io.on('connection', (socket) => {
  console.log('🟢 Cliente conectado al socket:', socket.id);

  // Eventos para productos
  socket.on('productos:solicitar-actualizacion', () => {
    console.log('📢 Solicitud de actualización de productos');
    io.emit('productos:actualizados', { timestamp: new Date() });
  });

  socket.on('disconnect', () => {
    console.log('🔴 Cliente desconectado:', socket.id);
  });
});

// Iniciar servidor
const startServer = async () => {
  try {
    // Probar conexión a base de datos
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.warn('⚠️ Servidor iniciando sin conexión a BD');
    }

    // Iniciar servidor HTTP
    server.listen(PORT, () => {
      console.log('\n=================================');
      console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
      console.log(`📡 API: http://localhost:${PORT}/api`);
      console.log(`🔌 WebSocket: http://localhost:${PORT}`);
      console.log(`🔄 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log('=================================\n');
    });

    // Manejo de cierre graceful
    process.on('SIGTERM', () => {
      console.log('📥 Señal SIGTERM recibida. Cerrando servidor...');
      server.close(() => {
        console.log('🛑 Servidor cerrado');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Error al iniciar servidor:', error);
    process.exit(1);
  }
};

startServer();