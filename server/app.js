const express = require('express')
const cors = require('cors')
const { createServer } = require('http')
const { Server } = require('socket.io')
const path = require('path');
const config = require('./config/config')
const errorHandler = require('./middleware/errorHandler')

// Import routes
const authRoutes = require('./routes/authRoutes')
const songRoutes = require('./routes/songRoutes')
const sessionRoutes = require('./routes/sessionRoutes')
const handleSocket = require('./sockets/socketHandler')

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST']
  }
})

// Middleware
const allowedOrigin = process.env.CORS_ORIGIN;
app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true,
}))
app.use(express.json())

// Routes
app.use('/auth', authRoutes)
app.use('/songs', songRoutes)
app.use('/sessions', sessionRoutes)

// Serve static frontend
const clientBuildPath = path.join(__dirname, 'public');
app.use(express.static(clientBuildPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// Socket.io setup
handleSocket(io)

// Error handling
app.use(errorHandler)

module.exports = { app, httpServer } 