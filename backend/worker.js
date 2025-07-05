export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      const origin = request.headers.get("Origin");
      const allowedOrigins = ["https://pashusewa.pages.dev"];

      const isAllowedOrigin = allowedOrigins.includes(origin);

      const corsHeaders = {
        "Access-Control-Allow-Origin": isAllowedOrigin ? origin : "null",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      };

      if (request.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
      }

      if (path === "/api/reports") {
        return getReports(env, corsHeaders);
      } else if (path === "/api/report") {
        return createReport(request, env, corsHeaders);
      } else if (path === "/api/update-status") {
        return updateStatus(request, env, corsHeaders);
      }

      return new Response("Not Found", { status: 404 });
    } catch (error) {
      console.error("Error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
};

async function getReports(env, corsHeaders = {}) {
  try {
    const result = await env.DB.prepare(
      "SELECT * FROM reports ORDER BY created_at DESC"
    ).run();
    return new Response(JSON.stringify(result.results), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch reports" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
}

async function createReport(request, env, corsHeaders = {}) {
  try {
    const { image, latitude, longitude, note } = await request.json();

    await env.DB.prepare(
      `
      INSERT INTO reports (image, latitude, longitude, note, created_at)
      VALUES (?, ?, ?, ?, ?)
    `
    )
      .bind(image, latitude, longitude, note, new Date().toISOString())
      .run();

    return new Response(
      JSON.stringify({ success: true, message: "Report created successfully" }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("Error creating report:", error);
    return new Response(JSON.stringify({ error: "Failed to create report" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
}

async function updateStatus(request, env, corsHeaders = {}) {
  try {
    const { id, status } = await request.json();

    await env.DB.prepare(
      `
      UPDATE reports 
      SET status = ? 
      WHERE id = ?
    `
    )
      .bind(status, id)
      .run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Error updating status:", error);
    return new Response(JSON.stringify({ error: "Failed to update status" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
}
