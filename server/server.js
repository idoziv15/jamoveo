require('dotenv').config()
const mongoose = require('mongoose')
const config = require('./config/config')
const logger = require('./utils/logger')
const { httpServer } = require('./app')

// MongoDB connection
mongoose.connect(config.mongoUri)
  .then(() => logger.info('Connected to MongoDB'))
  .catch(err => logger.error('MongoDB connection error:', err))

// Start server
const PORT = config.port
httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`)
}) 