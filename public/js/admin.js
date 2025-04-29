/**
 * PashuSewa - Admin Interface JavaScript
 * Handles displaying reports, filtering, and status updates.
 * Also provides location-based filtering to show nearby reports.
 */

// DOM Elements
const reportsTableBody = document.getElementById('reportsTableBody');
const filterButtons = document.querySelectorAll('.filter-btn');
const statusModal = document.getElementById('statusModal');
const updateStatusForm = document.getElementById('updateStatusForm');
const reportIdInput = document.getElementById('reportId');
const statusSelect = document.getElementById('statusSelect');
const closeModalButtons = document.querySelectorAll('.close-modal, .close-modal-btn');
const updateLocationBtn = document.getElementById('updateLocationBtn');
const currentLocation = document.getElementById('currentLocation');
const adminLatitude = document.getElementById('adminLatitude');
const adminLongitude = document.getElementById('adminLongitude');
const radiusInput = document.getElementById('radiusInput');

// Constants
const API_BASE_URL = typeof API_URL !== 'undefined' ? API_URL : '';  // Fallback to relative paths if not defined
const EARTH_RADIUS_KM = 6371; // Earth's radius in kilometers

// Current filter state
let currentFilter = 'all';
let allReports = []; // Store all reports to filter locally

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  fetchAdminLocation();
  loadReports();
});

// Location update button
updateLocationBtn.addEventListener('click', fetchAdminLocation);

// Radius input change
radiusInput.addEventListener('change', () => {
  filterReportsByDistance();
});

// Filter button click handlers
filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    // Update active filter
    filterButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    currentFilter = button.dataset.status;
    
    // Apply filters
    filterReportsByDistance();
  });
});

// Status update form submission
updateStatusForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const reportId = parseInt(reportIdInput.value, 10);
  const status = statusSelect.value;
  
  // Validate that we have both values
  if (!reportId || !status) {
    alert('Missing report ID or status value. Please try again.');
    return;
  }
  
  try {
    console.log('Updating status with:', { id: reportId, status });
    
    const response = await fetch(`${API_BASE_URL}/api/update-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: reportId, status }),
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('Status update result:', result);
      
      closeModal();
      loadReports();
    } else {
      const error = await response.json();
      console.error('Status update error:', error);
      alert(`Error: ${error.message || 'Failed to update status'}`);
    }
  } catch (error) {
    console.error('Error updating status:', error);
    alert('Failed to update status. Please try again later.');
  }
});

// Close modal handlers
closeModalButtons.forEach(button => {
  button.addEventListener('click', closeModal);
});

// Close modal when clicking outside
window.addEventListener('click', (event) => {
  if (event.target === statusModal) {
    closeModal();
  }
});

/**
 * Fetches the admin's current location
 */
function fetchAdminLocation() {
  currentLocation.textContent = 'Fetching your location...';
  
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        adminLatitude.value = latitude;
        adminLongitude.value = longitude;
        currentLocation.textContent = `Your location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        
        // After getting location, filter existing reports
        if (allReports.length > 0) {
          filterReportsByDistance();
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        currentLocation.textContent = 'Location unavailable. Please try again.';
      },
      { enableHighAccuracy: true }
    );
  } else {
    currentLocation.textContent = 'Geolocation is not supported by your browser.';
  }
}

/**
 * Calculate distance between two points using the Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} - Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = EARTH_RADIUS_KM * c;
  
  return distance;
}

/**
 * Filter reports by distance from admin location
 */
function filterReportsByDistance() {
  if (!adminLatitude.value || !adminLongitude.value) {
    reportsTableBody.innerHTML = '<tr><td colspan="8" class="loading-cell">Please update your location to see nearby reports</td></tr>';
    return;
  }
  
  const adminLat = parseFloat(adminLatitude.value);
  const adminLon = parseFloat(adminLongitude.value);
  const radius = parseInt(radiusInput.value, 10);
  
  // Filter reports by distance and status
  const filteredReports = allReports.filter(report => {
    // Add distance to each report
    report.distance = calculateDistance(
      adminLat, 
      adminLon, 
      report.latitude, 
      report.longitude
    );
    
    // Check if within radius
    const isWithinRadius = report.distance <= radius;
    
    // Check if matches status filter
    const matchesStatus = currentFilter === 'all' || report.status === currentFilter;
    
    return isWithinRadius && matchesStatus;
  });
  
  // Sort by distance
  filteredReports.sort((a, b) => a.distance - b.distance);
  
  // Display filtered reports
  if (filteredReports.length === 0) {
    reportsTableBody.innerHTML = `<tr><td colspan="8" class="loading-cell">No reports found within ${radius} km of your location</td></tr>`;
  } else {
    displayReports(filteredReports);
  }
}

/**
 * Loads reports from the API
 */
async function loadReports() {
  try {
    reportsTableBody.innerHTML = '<tr><td colspan="8" class="loading-cell">Loading reports...</td></tr>';
    
    // Get all reports, we'll filter on the client side
    const url = `${API_BASE_URL}/api/reports`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch reports');
    }
    
    allReports = await response.json();
    
    if (allReports.length === 0) {
      reportsTableBody.innerHTML = '<tr><td colspan="8" class="loading-cell">No reports found.</td></tr>';
      return;
    }
    
    // Filter by distance if location is available
    if (adminLatitude.value && adminLongitude.value) {
      filterReportsByDistance();
    } else {
      reportsTableBody.innerHTML = '<tr><td colspan="8" class="loading-cell">Please update your location to see nearby reports</td></tr>';
    }
    
  } catch (error) {
    console.error('Error loading reports:', error);
    reportsTableBody.innerHTML = '<tr><td colspan="8" class="loading-cell">Failed to load reports. Please try again later.</td></tr>';
  }
}

/**
 * Displays reports in the table
 */
function displayReports(reports) {
  reportsTableBody.innerHTML = '';
  
  reports.forEach(report => {
    const row = document.createElement('tr');
    
    // Format date
    const reportDate = new Date(report.created_at);
    const formattedDate = reportDate.toLocaleString();
    
    // Create status badge class
    const statusClass = `status-badge status-${report.status.toLowerCase().replace(' ', '-')}`;
    
    row.innerHTML = `
      <td>${report.id}</td>
      <td><img src="${report.image}" alt="Injured Animal" onclick="openImageInNewTab('${report.image}')"></td>
      <td>
        <a href="https://maps.google.com/?q=${report.latitude},${report.longitude}" target="_blank">
          ${report.latitude.toFixed(6)}, ${report.longitude.toFixed(6)}
        </a>
      </td>
      <td>${report.distance ? report.distance.toFixed(2) + ' km' : 'N/A'}</td>
      <td>${report.note || 'No notes provided'}</td>
      <td>${formattedDate}</td>
      <td><span class="${statusClass}">${report.status}</span></td>
      <td>
        <button class="action-btn" onclick="openStatusModal(${report.id}, '${report.status}')">
          Update Status
        </button>
      </td>
    `;
    
    reportsTableBody.appendChild(row);
  });
}

/**
 * Opens the status update modal
 */
function openStatusModal(reportId, currentStatus) {
  reportIdInput.value = reportId;
  statusSelect.value = currentStatus;
  statusModal.classList.remove('hidden');
}

/**
 * Closes the status update modal
 */
function closeModal() {
  statusModal.classList.add('hidden');
}

/**
 * Opens the image in a new tab (for larger view)
 */
function openImageInNewTab(imageUrl) {
  window.open(imageUrl, '_blank');
}

// Make modal functions globally accessible
window.openStatusModal = openStatusModal;
window.closeModal = closeModal;
window.openImageInNewTab = openImageInNewTab;
