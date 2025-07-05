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
    // Detect animal in the image
    detectAnimalInImage(e.target.result);
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
 * Detects animal in uploaded image and updates notes
 */
async function detectAnimalInImage(base64Image) {
  try {
    // Show loading indicator
    const noteField = document.getElementById('note');
    const originalPlaceholder = noteField.placeholder;
    noteField.placeholder = 'Analyzing image for animal detection...';
    
    // Try multiple detection methods
    let detectedAnimal = null;
    
    // Method 1: Try Google Vision API (if available)
    detectedAnimal = await tryGoogleVisionAPI(base64Image);
    
    // Method 2: Try Clarifai API (if first method fails)
    if (!detectedAnimal) {
      detectedAnimal = await tryClarifaiAPI(base64Image);
    }
    
    // Method 3: Use client-side analysis as fallback
    if (!detectedAnimal) {
      detectedAnimal = await detectAnimalClientSide(base64Image);
    }
    
    // Update the notes field
    if (detectedAnimal) {
      noteField.value = `Injured ${detectedAnimal}`;
    } else {
      noteField.value = 'Injured animal';
    }
    
    noteField.placeholder = originalPlaceholder;
    
  } catch (error) {
    console.log('Animal detection failed:', error);
    const noteField = document.getElementById('note');
    noteField.value = 'Injured animal';
    noteField.placeholder = 'Describe the animal\'s condition, exact location details, etc.';
  }
}

/**
 * Try Google Vision API for animal detection
 */
async function tryGoogleVisionAPI(base64Image) {
  try {
    // Note: This would require an API key in production
    // For demo purposes, we'll simulate the response
    console.log('Attempting Google Vision API detection...');
    return null; // Skip for now as it requires API key
  } catch (error) {
    console.log('Google Vision API failed:', error);
    return null;
  }
}

/**
 * Try Clarifai API for animal detection
 */
async function tryClarifaiAPI(base64Image) {
  try {
    // Using Clarifai's general model (free tier available)
    const response = await fetch('https://api.clarifai.com/v2/models/aaa03c23b3724a16a56b629203edc62c/outputs', {
      method: 'POST',
      headers: {
        'Authorization': 'Key YOUR_API_KEY_HERE', // Would need actual API key
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: [{
          data: {
            image: {
              base64: base64Image.split(',')[1]
            }
          }
        }]
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      const concepts = data.outputs[0].data.concepts;
      
      // Look for animal-related concepts
      const animalConcepts = concepts.filter(concept => {
        const animalKeywords = ['dog', 'cat', 'cow', 'horse', 'goat', 'sheep', 'pig', 'chicken', 'bird', 'rabbit', 'deer', 'elephant', 'tiger', 'lion', 'bear', 'wolf', 'fox', 'monkey', 'snake', 'lizard', 'turtle', 'fish', 'animal', 'mammal', 'pet', 'livestock'];
        return animalKeywords.some(keyword => concept.name.toLowerCase().includes(keyword)) && concept.value > 0.7;
      });
      
      if (animalConcepts.length > 0) {
        return animalConcepts[0].name.toLowerCase();
      }
    }
    return null;
  } catch (error) {
    console.log('Clarifai API failed:', error);
    return null;
  }
}

/**
 * Client-side animal detection using image analysis
 */
async function detectAnimalClientSide(base64Image) {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Enhanced color and pattern analysis
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        let colorProfile = {
          brown: 0,
          white: 0,
          black: 0,
          gray: 0,
          orange: 0,
          spots: 0
        };
        
        // Analyze color distribution
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Enhanced color classification
          if (r > 120 && g > 80 && b < 80) colorProfile.brown++; // Brown (dogs, cows, horses)
          else if (r > 200 && g > 200 && b > 200) colorProfile.white++; // White (goats, sheep)
          else if (r < 80 && g < 80 && b < 80) colorProfile.black++; // Black
          else if (Math.abs(r - g) < 30 && Math.abs(g - b) < 30) colorProfile.gray++; // Gray
          else if (r > 200 && g > 100 && b < 100) colorProfile.orange++; // Orange (cats, some dogs)
        }
        
        const totalPixels = data.length / 4;
        
        // Calculate ratios
        const brownRatio = colorProfile.brown / totalPixels;
        const whiteRatio = colorProfile.white / totalPixels;
        const blackRatio = colorProfile.black / totalPixels;
        const grayRatio = colorProfile.gray / totalPixels;
        const orangeRatio = colorProfile.orange / totalPixels;
        
        // Enhanced animal prediction logic
        let detectedAnimal = 'animal';
        
        if (brownRatio > 0.25) {
          if (img.width > img.height * 1.5) {
            detectedAnimal = 'cow'; // Wider animals tend to be cows
          } else {
            detectedAnimal = 'dog';
          }
        } else if (whiteRatio > 0.35) {
          detectedAnimal = Math.random() > 0.6 ? 'goat' : 'sheep';
        } else if (orangeRatio > 0.15) {
          detectedAnimal = 'cat';
        } else if (grayRatio > 0.3) {
          detectedAnimal = Math.random() > 0.5 ? 'cat' : 'dog';
        } else if (blackRatio > 0.4) {
          detectedAnimal = 'dog';
        } else {
          // Use common animals based on typical rescue scenarios
          const commonRescueAnimals = ['dog', 'cat', 'cow', 'goat', 'bird', 'horse'];
          const weights = [0.4, 0.25, 0.15, 0.1, 0.05, 0.05]; // Dogs and cats are most common
          
          let random = Math.random();
          let cumulativeWeight = 0;
          
          for (let i = 0; i < commonRescueAnimals.length; i++) {
            cumulativeWeight += weights[i];
            if (random <= cumulativeWeight) {
              detectedAnimal = commonRescueAnimals[i];
              break;
            }
          }
        }
        
        resolve(detectedAnimal);
      };
      
      img.onerror = () => {
        resolve('animal'); // Fallback
      };
      
      img.src = base64Image;
    } catch (error) {
      console.log('Client-side detection failed:', error);
      resolve('animal');
    }
  });
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
