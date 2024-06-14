const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const BusLocation = require('./busLocation'); // Import the BusLocation model

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the 'public' directory
app.use(express.static('public'));

mongoose.connect('mongodb://localhost:27017/busTracker', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

io.on('connection', (socket) => {
  console.log('A user connected');

  // Fetch initial bus locations from MongoDB and emit to clients
  BusLocation.find({}, (err, locations) => {
    if (err) {
      console.error('Error fetching bus locations:', err);
      return;
    }
    io.emit('initialBusLocations', locations);
  });

  // Update bus locations and emit to clients
  socket.on('updateBusLocations', (updatedBuses) => {
    updatedBuses.forEach((bus) => {
      // Update or insert bus location into MongoDB
      BusLocation.findOneAndUpdate(
        { id: bus.id },
        bus,
        { upsert: true, new: true },
        (err, doc) => {
          if (err) {
            console.error('Error updating bus location:', err);
            return;
          }
        }
      );
    });
    io.emit('updatedBusLocations', updatedBuses);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
