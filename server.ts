import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database('aravalli.db');

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'user'
  );

  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    source TEXT,
    time TEXT,
    type TEXT
  );

  CREATE TABLE IF NOT EXISTS analysis_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    location TEXT,
    status TEXT,
    ndvi REAL,
    construction TEXT,
    verification TEXT
  );

  CREATE TABLE IF NOT EXISTS markers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lat REAL,
    lng REAL,
    type TEXT,
    label TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS crashes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    error_message TEXT,
    stack_trace TEXT,
    user_agent TEXT
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER,
    username TEXT,
    action TEXT,
    details TEXT
  );
`);

// Seed data if empty
const userCount = db.prepare('SELECT count(*) as count FROM users').get() as { count: number };
if (userCount.count === 0) {
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('user', 'user', 'user');
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', 'password', 'admin');
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('nxtboi', 'Vijay@147896', 'admin');
} else {
  // Ensure the requested user exists with the requested password
  const existingUser = db.prepare('SELECT * FROM users WHERE username = ?').get('user') as any;
  if (existingUser) {
    db.prepare('UPDATE users SET password = ? WHERE username = ?').run('user', 'user');
  } else {
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('user', 'user', 'user');
  }

  // Ensure nxtboi admin exists
  const nxtboiUser = db.prepare('SELECT * FROM users WHERE username = ?').get('nxtboi') as any;
  if (nxtboiUser) {
    db.prepare('UPDATE users SET password = ?, role = ? WHERE username = ?').run('Vijay@147896', 'admin', 'nxtboi');
  } else {
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('nxtboi', 'Vijay@147896', 'admin');
  }
}

const reportCount = db.prepare('SELECT count(*) as count FROM reports').get() as { count: number };
if (reportCount.count === 0) {
  db.prepare('INSERT INTO reports (title, source, time, type) VALUES (?, ?, ?, ?)').run('Trucks seen entering protected zone at night', 'EcoWarrior Blog', '2 days ago', 'alert');
  db.prepare('INSERT INTO reports (title, source, time, type) VALUES (?, ?, ?, ?)').run('Government announces new green corridor initiative', 'GreenNews', '3 days ago', 'news');
  db.prepare('INSERT INTO reports (title, source, time, type) VALUES (?, ?, ?, ?)').run('Dust levels rising in Sector 42, residents complain', 'Local Observer', '5 days ago', 'report');
}

const markerCount = db.prepare('SELECT count(*) as count FROM markers').get() as { count: number };
if (markerCount.count === 0) {
  db.prepare('INSERT INTO markers (lat, lng, type, label) VALUES (?, ?, ?, ?)').run(26.9124, 75.7873, 'degradation', 'Degradation (NDVI Drop)');
  db.prepare('INSERT INTO markers (lat, lng, type, label) VALUES (?, ?, ?, ?)').run(26.8500, 75.8200, 'construction', 'Construction (High NTU)');
  db.prepare('INSERT INTO markers (lat, lng, type, label) VALUES (?, ?, ?, ?)').run(26.9800, 75.8500, 'growth', 'Natural Growth');
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes
  app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password) as any;
    if (user) {
      res.json({ id: user.id, username: user.username, role: user.role });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });

  app.get('/api/reports', (req, res) => {
    const reports = db.prepare('SELECT * FROM reports ORDER BY id DESC').all();
    res.json(reports);
  });

  app.get('/api/history', (req, res) => {
    const history = db.prepare('SELECT * FROM analysis_history ORDER BY id DESC').all();
    res.json(history);
  });

  app.get('/api/markers', (req, res) => {
    const markers = db.prepare('SELECT * FROM markers ORDER BY id DESC').all();
    res.json(markers);
  });

  // Simulation: Add a random marker every 60 seconds
  setInterval(() => {
    const hotspots = [
      { name: 'Sariska Tiger Reserve', lat: 27.32, lng: 76.43 },
      { name: 'Asola Bhatti Wildlife Sanctuary', lat: 28.48, lng: 77.21 },
      { name: 'Mount Abu Wildlife Sanctuary', lat: 24.59, lng: 72.71 },
      { name: 'Kumbhalgarh Forest', lat: 25.14, lng: 73.58 },
      { name: 'Mangar Bani Sacred Grove', lat: 28.41, lng: 77.12 },
      { name: 'Nahargarh Biological Park', lat: 26.93, lng: 75.82 },
      { name: 'Aravalli Biodiversity Park', lat: 28.47, lng: 77.10 },
      { name: 'Jhalana Leopard Reserve', lat: 26.88, lng: 75.84 }
    ];

    const types = ['degradation', 'construction', 'growth'];
    const type = types[Math.floor(Math.random() * types.length)];
    const hotspot = hotspots[Math.floor(Math.random() * hotspots.length)];
    
    // Add some jitter to the hotspot coordinates
    const lat = hotspot.lat + (Math.random() - 0.5) * 0.05;
    const lng = hotspot.lng + (Math.random() - 0.5) * 0.05;

    let label = '';
    if (type === 'degradation') {
      label = `Deforestation alert: Canopy loss detected in ${hotspot.name}`;
    } else if (type === 'construction') {
      label = `Illegal structure detected within ${hotspot.name} buffer zone`;
    } else {
      label = `Reforestation success: New vegetation growth in ${hotspot.name}`;
    }

    db.prepare('INSERT INTO markers (lat, lng, type, label) VALUES (?, ?, ?, ?)').run(lat, lng, type, label);
    
    // Keep only last 30 markers to prevent DB bloat
    const count = db.prepare('SELECT count(*) as count FROM markers').get() as { count: number };
    if (count.count > 30) {
      db.prepare('DELETE FROM markers WHERE id IN (SELECT id FROM markers ORDER BY id ASC LIMIT ?)')
        .run(count.count - 30);
    }
  }, 60000);

  app.get('/api/admin/stats', (req, res) => {
    const totalUsers = db.prepare('SELECT count(*) as count FROM users').get() as any;
    const totalCrashes = db.prepare('SELECT count(*) as count FROM crashes').get() as any;
    const totalLogs = db.prepare('SELECT count(*) as count FROM audit_logs').get() as any;
    res.json({
      totalUsers: totalUsers.count,
      totalCrashes: totalCrashes.count,
      totalLogs: totalLogs.count,
      aiRequests: 42,
      version: '1.2.1'
    });
  });

  app.post('/api/admin/log-crash', (req, res) => {
    const { error_message, stack_trace, user_agent } = req.body;
    db.prepare('INSERT INTO crashes (error_message, stack_trace, user_agent) VALUES (?, ?, ?)').run(error_message, stack_trace, user_agent);
    res.json({ status: 'ok' });
  });

  app.get('/api/admin/crashes', (req, res) => {
    const crashes = db.prepare('SELECT * FROM crashes ORDER BY timestamp DESC LIMIT 50').all();
    res.json(crashes);
  });

  app.post('/api/admin/log-audit', (req, res) => {
    const { user_id, username, action, details } = req.body;
    db.prepare('INSERT INTO audit_logs (user_id, username, action, details) VALUES (?, ?, ?, ?)').run(user_id, username, action, details);
    res.json({ status: 'ok' });
  });

  app.get('/api/admin/audit-logs', (req, res) => {
    const logs = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 50').all();
    res.json(logs);
  });

  // Vite middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
