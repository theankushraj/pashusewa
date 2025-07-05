/**
 * PashuSewa - User Interface JavaScript
 * Handles report submission, geolocation, image upload, and fetching reports.
 */

// DOM Elements
const reportBtn = document.getElementById('reportBtn');
const reportForm = document.getElementById('reportForm');
const animalReportForm = document.getElementById('animalReportForm');
const imageUpload = document.getElementById('imageUpload');
const imagePreview = document.getElementById('imagePreview');
const locationDisplay = document.getElementById('locationDisplay');
const latitudeInput = document.getElementById('latitude');
const longitudeInput = document.getElementById('longitude');
const refreshLocation = document.getElementById('refreshLocation');
const cancelReport = document.getElementById('cancelReport');
const confirmationMessage = document.getElementById('confirmationMessage');
const newReportBtn = document.getElementById('newReportBtn');
const reportsContainer = document.getElementById('reportsContainer');

// Constants - Use API_URL from config.js
const API_BASE_URL = typeof API_URL !== 'undefined' ? API_URL : '';

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, starting initialization...');
  console.log('API_BASE_URL:', API_BASE_URL);
  fetchLocation();
  loadRecentReports();
});

reportBtn.addEventListener('click', () => {
  reportBtn.classList.add('hidden');
  reportForm.classList.remove('hidden');
  fetchLocation();
});

cancelReport.addEventListener('click', () => {
  reportForm.classList.add('hidden');
  reportBtn.classList.remove('hidden');
  resetForm();
});

newReportBtn.addEventListener('click', () => {
  confirmationMessage.classList.add('hidden');
  reportBtn.classList.remove('hidden');
  resetForm();
});

animalReportForm.addEventListener('submit', handleReportSubmission);
refreshLocation.addEventListener('click', fetchLocation);
imageUpload.addEventListener('change', handleImageUpload);

// Functions
/**
 * Fetches user's current location using the Geolocation API
 */
function fetchLocation() {
  locationDisplay.value = 'Fetching your location...';
  
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        latitudeInput.value = latitude;
        longitudeInput.value = longitude;
        locationDisplay.value = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      },
      (error) => {
        console.error('Error getting location:', error);
        locationDisplay.value = 'Location unavailable. Please try again.';
      },
      { enableHighAccuracy: true }
    );
  } else {
    locationDisplay.value = 'Geolocation is not supported by your browser.';
  }
}

/**
 * Handles image upload and preview
 */
function handleImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file.');
    return;
  }
  
  const reader = new FileReader();
  
  reader.onload = (e) => {
    imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
  };
  
  reader.readAsDataURL(file);
}

/**
 * Handles the report submission
 */
async function handleReportSubmission(event) {
  event.preventDefault();
  console.log('Form submitted');
  
  // Validate form
  if (!imageUpload.files[0]) {
    alert('Please upload an image of the injured animal.');
    return;
  }
  
  if (!latitudeInput.value || !longitudeInput.value) {
    alert('Location information is required. Please refresh your location.');
    return;
  }
  
  // Prepare form data
  const formData = new FormData();
  const file = imageUpload.files[0];
  const note = document.getElementById('note').value;
  
  console.log('Converting image to base64...');
  // Convert image to base64
  const base64Image = await convertImageToBase64(file);
  
  // Create report object
  const report = {
    image: base64Image,
    latitude: parseFloat(latitudeInput.value),
    longitude: parseFloat(longitudeInput.value),
    note: note,
    created_at: new Date().toISOString()
  };
  console.log('Report object created:', report);
  
  // Submit report to API
  try {
    console.log('Submitting to API:', `${API_BASE_URL}/api/report`);
    const response = await fetch(`${API_BASE_URL}/api/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(report),
    });
    
    console.log('API Response:', response.status, response.statusText);
    
    if (response.ok) {
      console.log('Report submitted successfully');
      // Show confirmation and reset form
      reportForm.classList.add('hidden');
      confirmationMessage.classList.remove('hidden');
      resetForm();
      
      // Reload reports after submission
      loadRecentReports();
    } else {
      const error = await response.json();
      alert(`Error: ${error.message || 'Failed to submit report'}`);
    }
  } catch (error) {
    console.error('Error submitting report:', error);
    alert('Failed to submit report. Please try again later.');
  }
}

/**
 * Resets the form fields
 */
function resetForm() {
  animalReportForm.reset();
  imagePreview.innerHTML = '';
  latitudeInput.value = '';
  longitudeInput.value = '';
  locationDisplay.value = '';
}

/**
 * Converts an image file to base64 string
 */
function convertImageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Loads recent reports from the API
 */
async function loadRecentReports() {
  try {
    console.log('Loading recent reports...');
    reportsContainer.innerHTML = '<div class="loading">Loading recent reports...</div>';
    
    const apiUrl = `${API_BASE_URL}/api/reports`;
    console.log('Fetching from:', apiUrl);
    const response = await fetch(apiUrl);
    
    console.log('Reports API Response:', response.status, response.statusText);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch reports: ${response.status} - ${response.statusText}`);
    }
    
    const reports = await response.json();
    console.log('Fetched reports:', reports.length);
    
    if (reports.length === 0) {
      reportsContainer.innerHTML = '<p>No reports found.</p>';
      return;
    }
    
    // Display only the 6 most recent reports
    const recentReports = reports.slice(0, 6);
    displayReports(recentReports);
    
  } catch (error) {
    console.error('Error loading reports:', error);
    reportsContainer.innerHTML = '<p>Failed to load reports. Please try again later.</p>';
  }
}

/**
 * Displays reports in the container
 */
function displayReports(reports) {
  reportsContainer.innerHTML = '';
  
  reports.forEach(report => {
    const reportCard = document.createElement('div');
    reportCard.className = 'report-card';
    
    // Format date
    const reportDate = new Date(report.created_at);
    const formattedDate = reportDate.toLocaleString();
    
    // Create status class
    const statusClass = `status-${report.status.toLowerCase().replace(' ', '-')}`;
    
    reportCard.innerHTML = `
      <div class="report-card-image">
        <img src="${report.image}" alt="Injured Animal">
      </div>
      <div class="report-card-content">
        <span class="report-card-status ${statusClass}">${report.status}</span>
        <div class="report-card-location">
          <strong>Location:</strong> ${report.latitude.toFixed(6)}, ${report.longitude.toFixed(6)}
        </div>
        ${report.note ? `<div class="report-card-note">${report.note}</div>` : ''}
        <div class="report-card-time">${formattedDate}</div>
      </div>
    `;
    
    reportsContainer.appendChild(reportCard);
  });
}
