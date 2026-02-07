require('dotenv').config();

const http = require('http');
const { neon } = require('@neondatabase/serverless');

const dbUrl = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL is not set. Check backend/.env (or set NEON_DATABASE_URL).');
  process.exit(1);
}

const sql = neon(dbUrl);

// Validate connectivity on startup
(async () => {
  try {
    const result = await sql`SELECT version()`;
    console.log('✅ Neon connection verified:', (result[0]?.version || '').split(' ').slice(0, 2).join(' '));
  } catch (err) {
    console.error('❌ Neon connection failed on startup:', err.message || err);
    process.exit(1);
  }
})();

const requestHandler = async (req, res) => {
  if (req.url === '/health') {
    try {
      const start = Date.now();
      const result = await sql`SELECT version()`;
      const latency = Date.now() - start;
      const { version } = result[0] || { version: 'unknown' };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'healthy', version, latencyMs: latency }));
    } catch (err) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'unhealthy', error: err.message }));
    }
    return;
  }

  try {
    const result = await sql`SELECT version()`;
    const { version } = result[0] || { version: 'unknown' };
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(version);
  } catch (err) {
    console.error('Database query failed:', err.message || err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Database connection failed');
  }
};

const PORT = process.env.NEON_TEST_PORT || 3000;
http.createServer(requestHandler).listen(PORT, () => {
  console.log(`🚀 Neon test server running at http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
});
