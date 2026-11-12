const { fail } = require('../utils/Response');

module.exports = (err, req, res, next) => {
    console.error('❌ Error:', err);
    const status = err.status || 500;
    return fail(res, err.message || 'Error interno', status);
};