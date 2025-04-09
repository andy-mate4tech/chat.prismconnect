const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Configure CORS
app.use(cors({
  origin: '*', // In production, restrict this to your frontend domain
  methods: ['GET', 'POST'],
  credentials: true
}));

// Configure Socket.IO with CORS
const io = socketIo(server, {
  cors: {
    origin: '*', // In production, restrict this to your frontend domain
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Store active rooms and their participants
const rooms = {};

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Create a new room
  socket.on('createRoom', ({ roomId, name }) => {
    // Generate room ID if not provided
    const newRoomId = roomId || uuidv4().substring(0, 6);
    
    // Create room if it doesn't exist
    if (!rooms[newRoomId]) {
      rooms[newRoomId] = {
        id: newRoomId,
        participants: [],
        createdAt: new Date(),
        createdBy: name
      };
    }
    
    console.log(`Room created: ${newRoomId} by ${name}`);
    
    // Join the Socket.IO room
    socket.join(newRoomId);
    
    // Add user to room participants
    rooms[newRoomId].participants.push({
      id: socket.id,
      name,
      joinedAt: new Date()
    });
    
    // Send room info back to creator
    socket.emit('roomCreated', {
      roomId: newRoomId,
      participants: rooms[newRoomId].participants
    });
  });

  // Join an existing room
  socket.on('joinRoom', ({ roomId, signalData, from }) => {
    console.log(`User ${from} attempting to join room ${roomId}`);
    
    // Check if room exists
    if (!rooms[roomId]) {
      socket.emit('error', { message: `Room ${roomId} does not exist` });
      return;
    }
    
    // Join the Socket.IO room
    socket.join(roomId);
    
    // Add user to room participants
    rooms[roomId].participants.push({
      id: socket.id,
      name: from,
      joinedAt: new Date()
    });
    
    console.log(`User ${from} joined room ${roomId}`);
    
    // Notify other participants in the room
    socket.to(roomId).emit('userJoined', { signal: signalData, from });
  });

  // Handle call answer
  socket.on('answerCall', ({ signal, to, roomId }) => {
    console.log(`Call answered in room ${roomId}`);
    io.to(to).emit('roomJoined', signal);
  });

  // Handle call end
  socket.on('endCall', ({ roomId }) => {
    console.log(`Call ended in room ${roomId}`);
    
    // Notify all participants in the room
    io.to(roomId).emit('callEnded');
    
    // Remove room
    if (rooms[roomId]) {
      delete rooms[roomId];
      console.log(`Room ${roomId} deleted`);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Find rooms where this socket is a participant
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const participantIndex = room.participants.findIndex(p => p.id === socket.id);
      
      if (participantIndex !== -1) {
        const participant = room.participants[participantIndex];
        
        // Remove participant from room
        room.participants.splice(participantIndex, 1);
        
        console.log(`User ${participant.name} left room ${roomId}`);
        
        // Notify remaining participants
        socket.to(roomId).emit('userLeft', { 
          socketId: socket.id,
          name: participant.name
        });
        
        // Clean up empty rooms
        if (room.participants.length === 0) {
          delete rooms[roomId];
          console.log(`Room ${roomId} deleted (empty)`);
        }
      }
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Get active rooms (for debugging)
app.get('/rooms', (req, res) => {
  const roomSummary = Object.keys(rooms).map(roomId => ({
    id: roomId,
    participantCount: rooms[roomId].participants.length,
    createdAt: rooms[roomId].createdAt
  }));
  
  res.json(roomSummary);
});

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Signaling server running on port ${PORT}`);
});
