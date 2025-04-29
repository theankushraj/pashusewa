-- PashuSewa D1 Database Schema

-- Reports table to store animal injury reports
CREATE TABLE reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  image TEXT NOT NULL, -- Base64 encoded image or file URL
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'Pending', -- Pending, In Progress, Resolved
  created_at TEXT NOT NULL -- ISO timestamp
);

-- Insert some sample data (optional, remove for production)
INSERT INTO reports (image, latitude, longitude, note, status, created_at)
VALUES 
  ('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 28.7041, 77.1025, 'Injured dog on roadside', 'Pending', '2025-04-29T16:30:00Z'),
  ('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 28.6139, 77.2090, 'Cow with injured leg', 'In Progress', '2025-04-29T15:45:00Z'),
  ('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 28.5355, 77.3910, 'Bird with broken wing', 'Resolved', '2025-04-29T14:20:00Z');
