require('dotenv').config();

const express = require('express');
const session = require('express-session');
const passport = require('./config/passport');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// CORS configuration - only trusted domains (no IP addresses for security)
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:3000', 'https://lyrikalempire.com', 'https://www.lyrikalempire.com'];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(bodyParser.json());
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200,
  credentials: true,
};

app.use(cors(corsOptions));

// Additional CORS headers for audio files
app.use((req, res, next) => {
  // Set CORS headers for audio files specifically
  if (req.path.match(/\.(mp3|wav|m4a|aac|ogg|flac)$/i)) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
    res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
    res.header('Accept-Ranges', 'bytes');
  }
  next();
});

//app.use('/uploads', express.static(path.join(__dirname, '../client/public/uploads')));

app.use(express.static(path.join(__dirname, '../client/build')));

// Session configuration - use strong secret from environment variable
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  console.error('WARNING: SESSION_SECRET environment variable is not set. Using default (insecure).');
}

app.use(session({ 
  secret: sessionSecret || 'CHANGE_THIS_TO_A_STRONG_RANDOM_SECRET_IN_PRODUCTION', 
  resave: false, 
  saveUninitialized: false, // Changed to false for security - don't create session until needed
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Only send cookies over HTTPS in production
    httpOnly: true, // Prevent XSS attacks
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
app.use(passport.initialize());
app.use(passport.session());

const userRoutes = require('./routes/userRoute');
const keywordRoutes = require('./routes/keywordRoute');
const moodRoutes = require('./routes/moodRoute');
const featureRoutes = require('./routes/featureRoute');
const playlistRoutes = require('./routes/playlistRoute');
const beatRoutes = require('./routes/beatRoute');
const genreRoutes = require('./routes/genreRoute');
const lyricsRoutes = require('./routes/lyricsRoute');

app.use('/api/users', userRoutes);
app.use('/api/keywords', keywordRoutes);
app.use('/api/moods', moodRoutes);
app.use('/api/features', featureRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/beats', beatRoutes);
app.use('/api/genres', genreRoutes);
app.use('/api/lyrics', lyricsRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

// WebSocket connection handling with security
const authenticateWebSocket = require('./middleware/websocketAuth');
const { validateWebSocketEvent } = require('./middleware/websocketValidation');
const { checkRateLimit, cleanupSocket } = require('./middleware/websocketRateLimit');

// Apply authentication middleware
io.use(authenticateWebSocket);

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id} (User: ${socket.userId})`);

  // Helper function to handle validated events
  const handleEvent = (eventName, handler) => {
    socket.on(eventName, (data) => {
      // Rate limiting check
      const rateLimitCheck = checkRateLimit(socket.id, eventName);
      if (!rateLimitCheck.allowed) {
        socket.emit('error', { message: rateLimitCheck.error });
        return;
      }

      // Input validation (only validate if data is provided or required)
      const validation = validateWebSocketEvent(eventName, data);
      if (!validation.valid) {
        socket.emit('error', { message: validation.error });
        return;
      }

      // Execute handler (pass data if provided, otherwise undefined)
      try {
        handler(data);
      } catch (error) {
        console.error(`Error handling ${eventName}:`, error);
        socket.emit('error', { message: 'Internal server error' });
      }
    });
  };

  // Handle audio player events with validation
  handleEvent('audio-play', (data) => {
    socket.broadcast.emit('audio-play', data);
  });
  
  handleEvent('audio-pause', (data) => {
    socket.broadcast.emit('audio-pause', data);
  });
  
  handleEvent('audio-seek', (data) => {
    socket.broadcast.emit('audio-seek', data);
  });
  
  handleEvent('beat-change', (data) => {
    socket.broadcast.emit('beat-change', data);
  });
  
  // Add handlers for state request/response
  handleEvent('request-state', () => {
    // Broadcast to all clients except sender
    socket.broadcast.emit('request-state');
  });
  
  handleEvent('state-response', (data) => {
    // Broadcast to all clients except sender
    socket.broadcast.emit('state-response', data);
  });
  
  handleEvent('master-closed', (data) => {
    // Broadcast to all clients including sender
    io.emit('master-closed', data);
  });
  
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id} (User: ${socket.userId})`);
    cleanupSocket(socket.id);
  });
});

// The endpoint below is no longer needed since we're using WebSockets for the master-closed event
// Remove the /audio-pause-sync endpoint

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  // Server is now running silently
});