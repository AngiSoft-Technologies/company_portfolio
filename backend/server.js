require('dotenv').config();
const path = require('path');
const fs = require('fs');

const distIndex = path.join(__dirname, 'dist', 'src', 'index.js');

if (!fs.existsSync(distIndex)) {
  console.error('Build output not found. Run `npm run dev` for development or `npm run build` then `npm start` for production.');
  process.exit(1);
}

require(distIndex);
