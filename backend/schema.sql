-- PashuSewa Database Schema
CREATE TABLE reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  image TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',
  created_at TEXT NOT NULL
);
