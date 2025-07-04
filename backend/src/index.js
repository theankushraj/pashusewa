// Cloudflare Worker for API Proxy
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  try {
    // Get the URL path
    const url = new URL(request.url)
    const path = url.pathname

    // Handle API requests
    if (path.startsWith('/api/')) {
      // Get the function name from the path (e.g., /api/report -> report)
      const functionName = path.split('/')[2]
      
      // Get the function from the functions directory
      const functionPath = `../functions/api/${functionName}.js`
      const functionModule = await import(functionPath)
      
      // Call the appropriate function based on HTTP method
      const handler = request.method === 'GET' 
        ? functionModule.onRequestGet 
        : functionModule.onRequestPost
      
      if (handler) {
        return handler({ request, env: { DB: D1Database } })
      }
    }

    // Return 404 for other paths
    return new Response('Not Found', { status: 404 })
  } catch (error) {
    console.error('Error handling request:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
}
