/**
 * Cloudflare Pages Function - Update Report Status
 * POST /api/update-status
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

export async function onRequestOptions(context) {
  return handleOptions(context.request);
}
