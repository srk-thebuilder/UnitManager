const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Helper function to set CORS headers
const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

module.exports = async (req, res) => {
  setCorsHeaders(res);

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { pathname } = new URL(req.url, `http://${req.headers.host}`);

  try {
    // GET /api/names?role=user
    if (pathname === '/api/names' && req.method === 'GET') {
      const role = req.query.role || 'user';
      
      const result = await pool.query(
        'SELECT id, full_name FROM users WHERE role = $1 ORDER BY full_name',
        [role]
      );

      return res.status(200).json(result.rows);
    }

    // POST /api/login
    if (pathname === '/api/login' && req.method === 'POST') {
      const { fullName, pin, role } = req.body;

      if (!fullName || !pin || !role) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required fields' 
        });
      }

      const result = await pool.query(
        'SELECT * FROM users WHERE full_name = $1 AND pin = $2 AND role = $3',
        [fullName, pin, role]
      );

      if (result.rows.length === 0) {
        return res.status(200).json({ 
          success: false, 
          error: 'Invalid credentials' 
        });
      }

      const user = result.rows[0];
      return res.status(200).json({ 
        success: true,
        user: {
          id: user.id,
          full_name: user.full_name,
          role: user.role
        }
      });
    }

    // Health check
    if (pathname === '/api/health' && req.method === 'GET') {
      return res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString() 
      });
    }

    // 404
    return res.status(404).json({ error: 'Route not found' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error' 
    });
  }
};
