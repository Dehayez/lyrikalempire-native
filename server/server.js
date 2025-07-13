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
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://lyrikalempire.com', 'http://174.138.4.195:4000', 'http://174.138.4.195', 'https://lyrikalempire.com', 'https://www.lyrikalempire.com'],
    methods: ['GET', 'POST']
  }
});

app.use(bodyParser.json());
const corsOptions = {
  origin: ['http://localhost:3000', 'http://lyrikalempire.com', 'http://174.138.4.195:4000', 'http://174.138.4.195', 'https://lyrikalempire.com', 'https://www.lyrikalempire.com'],
  optionsSuccessStatus: 200,
  credentials: true,
};

app.use(cors(corsOptions));

//app.use('/uploads', express.static(path.join(__dirname, '../client/public/uploads')));

app.use(express.static(path.join(__dirname, '../client/build')));

app.use(session({ secret: 'your_secret_key', resave: false, saveUninitialized: true }));
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

// WebSocket connection handling
io.on('connection', (socket) => {
  // Handle audio player events
  socket.on('audio-play', (data) => {
    socket.broadcast.emit('audio-play', data);
  });
  
  socket.on('audio-pause', (data) => {
    socket.broadcast.emit('audio-pause', data);
  });
  
  socket.on('audio-seek', (data) => {
    socket.broadcast.emit('audio-seek', data);
  });
  
  socket.on('beat-change', (data) => {
    socket.broadcast.emit('beat-change', data);
  });
  
  // Add handlers for state request/response
  socket.on('request-state', (data) => {
    // Broadcast to all clients except sender
    socket.broadcast.emit('request-state', data);
  });
  
  socket.on('state-response', (data) => {
    // Broadcast to all clients except sender
    socket.broadcast.emit('state-response', data);
  });
  
  socket.on('master-closed', (data) => {
    // Broadcast to all clients including sender
    io.emit('master-closed', data);
  });
  
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

// The endpoint below is no longer needed since we're using WebSockets for the master-closed event
// Remove the /audio-pause-sync endpoint

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  // Server is now running silently
});