/**
 * Cloudflare Pages Function - Submit Report
 * POST /api/report
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

export async function onRequestPost(context) {
  const { request, env } = context;
  
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

export async function onRequestOptions(context) {
  return handleOptions(context.request);
}
