export default {
  async fetch(request) {
    try {
      const url = new URL(request.url)
      const path = url.pathname

      if (path === '/api/reports') {
        return getReports()
      } else if (path === '/api/report') {
        return createReport(request)
      } else if (path === '/api/update-status') {
        return updateStatus(request)
      }

      return new Response('Not Found', { status: 404 })
    } catch (error) {
      console.error('Error:', error)
      return new Response('Internal Server Error', { status: 500 })
    }
  }
}

async function getReports() {
  const result = await DB.prepare('SELECT * FROM reports ORDER BY created_at DESC').run()
  return new Response(JSON.stringify(result.results), {
    headers: { 'Content-Type': 'application/json' }
  })
}

async function createReport(request) {
  const { image, latitude, longitude, note } = await request.json()
  
  await DB.prepare(`
    INSERT INTO reports (image, latitude, longitude, note, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(image, latitude, longitude, note, new Date().toISOString()).run()
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
}

async function updateStatus(request) {
  const { id, status } = await request.json()
  
  await DB.prepare(`
    UPDATE reports 
    SET status = ? 
    WHERE id = ?
  `).bind(status, id).run()
  
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
}
