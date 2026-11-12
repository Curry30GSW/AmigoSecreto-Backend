const path = require('path');

module.exports = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads');
