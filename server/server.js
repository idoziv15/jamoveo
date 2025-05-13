require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const { createServer } = require('http')
const { Server } = require('socket.io')
const authRoutes = require('./routes/authRoutes')
const songRoutes = require('./routes/songRoutes')
const socketHandler = require('./sockets/socketHandler')

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
})

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173'
}))
app.use(express.json())

// Routes
app.use('/auth', authRoutes)
app.use('/songs', songRoutes)

// Socket.IO
socketHandler(io)

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err))

const PORT = process.env.PORT || 3000
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
}) 