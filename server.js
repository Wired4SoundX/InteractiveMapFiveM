const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');
const mongoose = require('mongoose');

// MongoDB Connection - REPLACE WITH YOUR CONNECTION STRING
const MONGODB_URI = process.env.MONGODB_URI || 'YOUR_MONGODB_CONNECTION_STRING_HERE';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Marker Schema
const markerSchema = new mongoose.Schema({
  id: String,
  coords: { lat: Number, lng: Number },
  title: String,
  desc: String,
  color: String,
  createdAt: { type: Date, default: Date.now }
});

// Category Schema
const categorySchema = new mongoose.Schema({
  id: String,
  name: String,
  color: String,
  createdAt: { type: Date, default: Date.now }
});

const Marker = mongoose.model('Marker', markerSchema);
const Category = mongoose.model('Category', categorySchema);

// Serve static files
app.use(express.static('public'));

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.IO connection
io.on('connection', async (socket) => {
  console.log('User connected:', socket.id);
  
  // Load existing markers and categories from database
  try {
    const markers = await Marker.find();
    const categories = await Category.find();
    socket.emit('loadMarkers', markers);
    socket.emit('loadCategories', categories);
  } catch (err) {
    console.error('Error loading data:', err);
  }
  
  // Handle new marker
  socket.on('addMarker', async (markerData) => {
    try {
      const marker = new Marker(markerData);
      await marker.save();
      io.emit('newMarker', markerData);
      console.log('Marker added:', markerData);
    } catch (err) {
      console.error('Error saving marker:', err);
    }
  });
  
  // Handle delete marker
  socket.on('deleteMarker', async (markerId) => {
    try {
      console.log('🔍 Attempting to delete marker with ID:', markerId);
      console.log('🔍 Type of markerId:', typeof markerId);
      
      // First, let's see what's actually in the database
      const allMarkers = await Marker.find();
      console.log('📍 All markers in DB:', allMarkers.map(m => ({ id: m.id, _id: m._id })));
      
      // Try both id field and MongoDB _id field
      const result = await Marker.deleteOne({ 
        $or: [
          { id: markerId }, 
          { id: String(markerId) },
          { _id: markerId }
        ] 
      });
      
      console.log('📊 Delete result:', result);
      
      if (result.deletedCount > 0) {
        io.emit('markerDeleted', markerId);
        console.log('✅ Marker deleted successfully:', markerId);
      } else {
        console.log('⚠️ No marker found with ID:', markerId);
        console.log('⚠️ This usually means ID mismatch between frontend and database');
      }
    } catch (err) {
      console.error('❌ Error deleting marker:', err);
    }
  });
  
  // Handle marker color update
  socket.on('updateMarkerColor', async ({ markerId, newColor }) => {
    try {
      await Marker.updateOne({ id: markerId }, { color: newColor });
      io.emit('markerColorUpdated', { markerId, newColor });
      console.log('Marker color updated:', markerId, newColor);
    } catch (err) {
      console.error('Error updating marker color:', err);
    }
  });
  
  // Handle new category
  socket.on('addCategory', async (categoryData) => {
    try {
      const category = new Category(categoryData);
      await category.save();
      io.emit('newCategory', categoryData);
      console.log('Category added:', categoryData);
    } catch (err) {
      console.error('Error saving category:', err);
    }
  });
  
  // Handle delete category
  socket.on('deleteCategory', async (categoryId) => {
    try {
      await Category.deleteOne({ id: categoryId });
      io.emit('deleteCategory', categoryId);
      console.log('Category deleted:', categoryId);
    } catch (err) {
      console.error('Error deleting category:', err);
    }
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
