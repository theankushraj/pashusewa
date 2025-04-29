/**
 * PashuSewa - Cloudflare Worker API
 * 
 * This Worker implements the backend API for the PashuSewa application.
 * It connects to a D1 database and provides endpoints for:
 * - Submitting reports
 * - Retrieving reports
 * - Updating report status
 */

// JSON response helper function
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// Error response helper function
function errorResponse(message, status = 400) {
  return jsonResponse({ success: false, message }, status);
}

// Handle CORS preflight requests
async function handleOptions(request) {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// API status response
function apiStatusResponse() {
  return jsonResponse({
    status: "ok",
    message: "PashuSewa API is running",
    endpoints: [
      "POST /api/report - Submit a new animal report",
      "GET /api/reports - Get all reports",
      "POST /api/update-status - Update the status of a report"
    ]
  });
}

// Handle API routes
async function handleApiRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Handle different API endpoints
  if (path === '/api/report' && request.method === 'POST') {
    return handleSubmitReport(request, env);
  } else if (path === '/api/reports' && request.method === 'GET') {
    return handleGetReports(request, env);
  } else if (path === '/api/update-status' && request.method === 'POST') {
    return handleUpdateStatus(request, env);
  } else {
    return errorResponse('Endpoint not found', 404);
  }
}

// Handle report submission
async function handleSubmitReport(request, env) {
  try {
    // Check if DB binding is available
    if (!env.DB) {
      return errorResponse('Database not configured', 500);
    }

    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.image || !body.latitude || !body.longitude) {
      return errorResponse('Missing required fields: image, latitude, longitude');
    }
    
    // Validate coordinates
    if (isNaN(parseFloat(body.latitude)) || isNaN(parseFloat(body.longitude))) {
      return errorResponse('Invalid coordinates. Latitude and longitude must be numbers.');
    }
    
    // Prepare data for insertion
    const reportData = {
      image: body.image,
      latitude: body.latitude,
      longitude: body.longitude,
      note: body.note || '',
      status: 'Pending',
      created_at: body.created_at || new Date().toISOString()
    };
    
    // Insert into database
    const result = await env.DB.prepare(`
      INSERT INTO reports (image, latitude, longitude, note, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      reportData.image,
      reportData.latitude,
      reportData.longitude,
      reportData.note,
      reportData.status,
      reportData.created_at
    ).run();
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    return jsonResponse({
      success: true,
      message: 'Report submitted successfully',
      id: result.meta?.last_row_id
    });
    
  } catch (error) {
    console.error('Error submitting report:', error);
    return errorResponse('Failed to submit report: ' + error.message, 500);
  }
}

// Handle getting reports
async function handleGetReports(request, env) {
  try {
    // Check if DB binding is available
    if (!env.DB) {
      return errorResponse('Database not configured', 500);
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    
    let query = `
      SELECT id, image, latitude, longitude, note, status, created_at
      FROM reports
    `;
    
    // Add filter if status is provided
    if (status) {
      query += ` WHERE status = ?`;
    }
    
    // Order by most recent first
    query += ` ORDER BY created_at DESC`;
    
    // Prepare and execute query
    const stmt = env.DB.prepare(query);
    
    // Bind status parameter if provided
    const result = status ? 
      await stmt.bind(status).all() : 
      await stmt.all();
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    // Ensure coordinates are numbers for client-side calculations
    const reports = result.results.map(report => ({
      ...report,
      latitude: parseFloat(report.latitude),
      longitude: parseFloat(report.longitude)
    }));
    
    return jsonResponse(reports);
    
  } catch (error) {
    console.error('Error getting reports:', error);
    return errorResponse('Failed to get reports: ' + error.message, 500);
  }
}

// Handle updating report status
async function handleUpdateStatus(request, env) {
  try {
    // Check if DB binding is available
    if (!env.DB) {
      return errorResponse('Database not configured', 500);
    }

    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    if (!body.id || !body.status) {
      return errorResponse('Missing required fields: id, status');
    }
    
    // Validate status value
    const validStatuses = ['Pending', 'In Progress', 'Resolved'];
    if (!validStatuses.includes(body.status)) {
      return errorResponse('Invalid status. Must be: Pending, In Progress, or Resolved');
    }
    
    // Ensure the ID is treated as an integer
    const reportId = parseInt(body.id, 10);
    
    // Check if the ID is valid
    if (isNaN(reportId) || reportId <= 0) {
      return errorResponse('Invalid report ID', 400);
    }
    
    console.log(`Updating report ${reportId} to status: ${body.status}`);
    
    // Update in database
    const result = await env.DB.prepare(`
      UPDATE reports
      SET status = ?
      WHERE id = ?
    `).bind(
      body.status,
      reportId
    ).run();
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    // Check if any row was updated
    if (result.meta?.changes === 0) {
      return errorResponse('Report not found', 404);
    }
    
    return jsonResponse({
      success: true,
      message: 'Status updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating status:', error);
    return errorResponse('Failed to update status: ' + error.message, 500);
  }
}

// Main request handler
export default {
  async fetch(request, env, ctx) {
    // Get request URL and method
    const url = new URL(request.url);
    const method = request.method;
    const path = url.pathname;
    
    // Handle CORS preflight requests
    if (method === 'OPTIONS') {
      return handleOptions(request);
    }
    
    // Handle API requests
    if (path.startsWith('/api/')) {
      return handleApiRequest(request, env);
    }
    
    // Return API status for root path
    return apiStatusResponse();
  }
};
