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

const allowedOrigins = [
  'https://gregarious-dodol-ce944f.netlify.app',
  'http://localhost:5173'
];

app.use(cors({
  origin: function (origin, callback) {
    console.log('🔍 Checking origin for CORS:', origin);
    if (!origin || allowedOrigins.includes(origin) || /\.netlify\.app$/.test(origin)) {
      console.log('✅ Origin allowed:', origin);
      callback(null, true);
    } else {
      console.warn('❌ Origin blocked by CORS:', origin);
      callback(new Error('CORS not allowed from this origin'));
    }
  },
  credentials: true,
}));

app.use(express.json())

const httpServer = createServer(app)


const io = new Server(httpServer, {
  // cors: {
  //   origin: '*',            // allow all origins
  //   methods: ['GET', 'POST'], // allow these methods
  //   allowedHeaders: ['Content-Type', 'Authorization'],
  //   credentials: false        // no cookies/tokens needed
  // }
})

// const io = new Server(httpServer, {
//   cors: {
//     origin: '*',
//     methods: ['GET', 'POST']
//   }
// })

// Routes
app.use('/auth', authRoutes)
app.use('/songs', songRoutes)
app.use('/sessions', sessionRoutes)
app.get('/health', (req, res) => {
  res.send('✅ Server is alive');
});

// Serve static frontend
// const clientBuildPath = path.join(__dirname, 'public');
// app.use(express.static(clientBuildPath));
// app.get('*', (req, res) => {
//   res.sendFile(path.join(clientBuildPath, 'index.html'));
// });

// Socket.io setup
handleSocket(io)

app.use((err, req, res, next) => {
  console.error('🚨 Server error:', err.message);

  // החזרת הרשאות CORS גם במקרה של שגיאה
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    status: 'error',
    message,
  });
});

// Error handling
app.use(errorHandler)

module.exports = { app, httpServer } 