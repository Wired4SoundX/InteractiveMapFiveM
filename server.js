const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// Store markers and categories in memory
let markers = [];
let categories = [];

// Serve static files
app.use(express.static('public'));

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Send existing markers and categories to new user
  socket.emit('loadMarkers', markers);
  socket.emit('loadCategories', categories);
  
  // Handle new marker
  socket.on('addMarker', (marker) => {
    markers.push(marker);
    io.emit('newMarker', marker);
    console.log('Marker added:', marker);
  });
  
  // Handle new category
  socket.on('addCategory', (category) => {
    categories.push(category);
    io.emit('newCategory', category);
    console.log('Category added:', category);
  });
  
  // Handle delete category
  socket.on('deleteCategory', (categoryId) => {
    categories = categories.filter(c => c.id !== categoryId);
    io.emit('deleteCategory', categoryId);
    console.log('Category deleted:', categoryId);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
