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
// app.use(cors({
//   origin: '*',
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
//   credentials: true,
// }))
// app.use((req, res, next) => {
//   res.header('Access-Control-Allow-Origin', '*');
//   res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
//   res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
//   res.header('Access-Control-Allow-Credentials', 'true');
//   if (req.method === 'OPTIONS') {
//     return res.sendStatus(204);
//   }
//   next();
// });

const allowedOrigins = [
  'https://gregarious-dodol-ce944f.netlify.app',
  'http://localhost:5173'
];

// Allow Netlify preview URLs dynamically:
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

// Middleware
// const allowedOrigin = process.env.CORS_ORIGIN;
// app.use(cors({
//   origin: process.env.CORS_ORIGIN || true,
//   credentials: true,
// }))

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

// Error handling
app.use(errorHandler)

module.exports = { app, httpServer } 