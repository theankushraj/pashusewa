# PashuSewa

A web application for reporting injured animals and managing rescue operations.

## Features

- User Interface:
  - Report injured animals with photo and location
  - View past reports
- Admin Interface:
  - View all reports
  - Update status (Pending, In Progress, Resolved)
  - Filter reports by status

## Technology Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Cloudflare Workers
- Database: Cloudflare D1 (SQLite)

## Project Structure

- `public/`: Static frontend files
- `src/`: Cloudflare Workers code
- `wrangler.toml`: Cloudflare configuration
- `schema.sql`: D1 database schema

## Deployment

This project is configured for deployment on Cloudflare Pages with Cloudflare Workers and D1 database.

### Setup Instructions

1. Install Wrangler CLI: `npm install -g wrangler`
2. Login to Cloudflare: `wrangler login`
3. Create D1 database: `wrangler d1 create pashusewa`
4. Apply database schema: `wrangler d1 execute pashusewa --file=schema.sql`
5. Update the database ID in wrangler.toml
6. Deploy: `wrangler publish`
