const express = require('express')
const cors = require('cors')
const { createServer } = require('http')
const { Server } = require('socket.io')
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
app.use(cors({
  origin: config.corsOrigin
}))
app.use(express.json())

// Routes
app.use('/auth', authRoutes)
app.use('/songs', songRoutes)
app.use('/sessions', sessionRoutes)

// Socket.io setup
handleSocket(io)

// Error handling
app.use(errorHandler)

module.exports = { app, httpServer } 