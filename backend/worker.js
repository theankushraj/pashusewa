export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url)
      const path = url.pathname

      if (path === '/api/reports') {
        return getReports(env)
      } else if (path === '/api/report') {
        return createReport(request, env)
      } else if (path === '/api/update-status') {
        return updateStatus(request, env)
      }

      return new Response('Not Found', { status: 404 })
    } catch (error) {
      console.error('Error:', error)
      return new Response('Internal Server Error', { status: 500 })
    }
  }
}

async function getReports(env) {
  const result = await env.DB.prepare('SELECT * FROM reports ORDER BY created_at DESC').run()
  return new Response(JSON.stringify(result.results), {
    headers: { 'Content-Type': 'application/json' }
  })
}

async function createReport(request, env) {
  const { image, latitude, longitude, note } = await request.json()
  
  await env.DB.prepare(`
    INSERT INTO reports (image, latitude, longitude, note, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(image, latitude, longitude, note, new Date().toISOString()).run()
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
}

async function updateStatus(request, env) {
  const { id, status } = await request.json()
  
  await env.DB.prepare(`
    UPDATE reports 
    SET status = ? 
    WHERE id = ?
  `).bind(status, id).run()
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
}
