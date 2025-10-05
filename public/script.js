const socket = io();

const mapBounds = [[0, 0], [768, 768]];
const map = L.map('map', {
  crs: L.CRS.Simple,
  minZoom: -3,
  maxZoom: 5,
  zoomSnap: 0.25,
  wheelPxPerZoomLevel: 100,
});
L.imageOverlay('gta_map.jpg', mapBounds).addTo(map);
map.fitBounds(mapBounds);

let selectedCoords = null;
let categories = [];

// Load markers from server
socket.on('loadMarkers', (markers) => {
  markers.forEach(addMarkerToMap);
});

socket.on('newMarker', (marker) => {
  addMarkerToMap(marker);
});

// Load categories from server
socket.on('loadCategories', (cats) => {
  categories = cats;
  renderCategories();
});

socket.on('newCategory', (category) => {
  categories.push(category);
  renderCategories();
});

socket.on('deleteCategory', (categoryId) => {
  categories = categories.filter(c => c.id !== categoryId);
  renderCategories();
});

const markerObjects = {};

function addMarkerToMap(marker) {
  if (!marker.id) {
    marker.id = Date.now().toString() + Math.random();
  }
  
  const m = L.circleMarker(marker.coords, {
    radius: 8,
    color: marker.color,
    fillColor: marker.color,
    fillOpacity: 0.9,
    weight: 2
  }).addTo(map);
  
  const popupContent = `
    <div style="min-width: 150px;">
      <strong>${marker.title}</strong><br>
      ${marker.desc}<br>
      <button onclick="confirmDeleteMarker('${marker.id}')" 
              style="margin-top: 8px; padding: 6px 12px; background: #ff4444; 
                     color: white; border: none; border-radius: 5px; 
                     cursor: pointer; font-size: 12px; width: 100%;">
        Delete Marker
      </button>
    </div>
  `;
  
  m.bindPopup(popupContent);
  markerObjects[marker.id] = { marker: m, data: marker };
}

function confirmDeleteMarker(markerId) {
  if (confirm('Are you sure you want to delete this marker?')) {
    socket.emit('deleteMarker', markerId);
  }
}

function removeMarkerFromMap(markerId) {
  if (markerObjects[markerId]) {
    map.removeLayer(markerObjects[markerId].marker);
    delete markerObjects[markerId];
  }
}

// Map click handler
map.on('click', (e) => {
  selectedCoords = e.latlng;
  document.getElementById('form').style.display = 'flex';
});

// Add marker button
document.getElementById('addMarkerBtn').addEventListener('click', () => {
  const title = document.getElementById('markerTitle').value.trim() || "Untitled";
  const desc = document.getElementById('markerDesc').value.trim() || "No description";
  const color = document.getElementById('markerColor').value;
  if (!selectedCoords) return alert("Click on the map first!");
  const markerData = { coords: selectedCoords, title, desc, color };
  socket.emit('addMarker', markerData);
  document.getElementById('form').style.display = 'none';
  document.getElementById('markerTitle').value = '';
  document.getElementById('markerDesc').value = '';
});

// Close form button
document.getElementById('closeForm').addEventListener('click', () => {
  document.getElementById('form').style.display = 'none';
});

// Legend toggle
document.getElementById('legendToggle').addEventListener('click', () => {
  document.getElementById('legend').classList.toggle('collapsed');
});

// Add category button
document.getElementById('addCategoryBtn').addEventListener('click', () => {
  const name = document.getElementById('categoryName').value.trim();
  const color = document.getElementById('categoryColor').value;
  
  if (!name) return alert("Please enter a category name!");
  
  const category = {
    id: Date.now().toString(),
    name: name,
    color: color
  };
  
  socket.emit('addCategory', category);
  document.getElementById('categoryName').value = '';
  document.getElementById('categoryColor').value = '#ff0000';
});

// Render categories list
function renderCategories() {
  const list = document.getElementById('categoryList');
  
  if (categories.length === 0) {
    list.innerHTML = '<div style="padding: 10px; text-align: center; color: #666;">No categories yet</div>';
    return;
  }
  
  list.innerHTML = categories.map(cat => `
    <div class="category-item">
      <div class="category-color" style="background-color: ${cat.color}"></div>
      <div class="category-name">${cat.name}</div>
      <button class="category-delete" onclick="deleteCategory('${cat.id}')">Delete</button>
    </div>
  `).join('');
}

// Delete category
function deleteCategory(id) {
  socket.emit('deleteCategory', id);
}

// Initial render
renderCategories();
