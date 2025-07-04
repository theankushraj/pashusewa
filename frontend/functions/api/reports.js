/**
 * Cloudflare Pages Function - Get Reports
 * GET /api/reports
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

export async function onRequestGet(context) {
  const { request, env } = context;
  
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

export async function onRequestOptions(context) {
  return handleOptions(context.request);
}
