const app = require('./app');
const http = require('http');
const socketIO = require('socket.io');
const { testConnection } = require('./config/db');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

// 🔥 SOCKET.IO CORREGIDO
const io = socketIO(server, {
  cors: {
    origin: [
      'http://localhost:4200',
      'https://panaderiatresreyes.com',
      'https://www.panaderiatresreyes.com'
    ],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.set('io', io);

// 🔥 SOCKET EVENTOS
io.on('connection', (socket) => {
  console.log('🟢 Cliente conectado:', socket.id);

  socket.on('disconnect', () => {
    console.log('🔴 Cliente desconectado:', socket.id);
  });
});

// 🔥 INICIAR SERVIDOR
const startServer = async () => {
  try {
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.warn('⚠️ Sin conexión a BD');
    }

    server.listen(PORT, () => {
      console.log('=================================');
      console.log(`🚀 Servidor en puerto ${PORT}`);
      console.log(`🌐 API: https://panaderiatresreyes.onrender.com/api`);
      console.log('=================================');
    });

  } catch (error) {
    console.error('❌ Error al iniciar:', error);
    process.exit(1);
  }
};

startServer();