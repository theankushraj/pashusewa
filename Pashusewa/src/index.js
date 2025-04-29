/**
 * PashuSewa - Cloudflare Worker
 * 
 * This Worker implements the backend API for the PashuSewa application.
 * It connects to a D1 database and provides endpoints for:
 * - Submitting reports
 * - Retrieving reports
 * - Updating report status
 */

// HTML response helper function
function htmlResponse(html) {
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}

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
    return errorResponse('Not found', 404);
  }
}

// Handle report submission
async function handleSubmitReport(request, env) {
  try {
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
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    
    // Note: We no longer filter by coordinates on the server
    // Filtering by distance is done on the client side
    // We just need to provide all the data with coordinates
    
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
    
    // Update in database
    const result = await env.DB.prepare(`
      UPDATE reports
      SET status = ?
      WHERE id = ?
    `).bind(
      body.status,
      body.id
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
    
    // Handle CORS preflight requests
    if (method === 'OPTIONS') {
      return handleOptions(request);
    }
    
    // Handle API requests
    if (url.pathname.startsWith('/api/')) {
      return handleApiRequest(request, env);
    }
    
    // Serve static files or index.html for other routes
    return env.ASSETS.fetch(request);
  }
};
