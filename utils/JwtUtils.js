const jwt = require('jsonwebtoken');

const sign = (payload) =>
    jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { expiresIn: process.env.JWT_ACCESS_EXPIRES || '2h' });

const verify = (token) => jwt.verify(token, process.env.JWT_ACCESS_SECRET);

module.exports = { sign, verify };