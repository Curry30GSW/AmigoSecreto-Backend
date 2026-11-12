const pool = require('../config/ConectDb');


async function registrarAuditoria(usuario, ip, accion, detalles = null) {
    try {
        let evento = accion;

        if (detalles) {
            if (typeof detalles === 'object') {
                evento = `${accion} - ${JSON.stringify(detalles)}`;
            } else {
                evento = `${accion} - ${detalles}`;
            }
        }

        const query = `INSERT INTO audit (usuario, ip, evento, fecha) VALUES (?, ?, ?, NOW())`;
        await pool.execute(query, [usuario, ip, evento]);
    } catch (error) {
        console.error('❌ Error al registrar auditoría:', error.message);
    }
}

function getClientIp(req) {
    return (
        req.headers['x-forwarded-for']?.split(',')[0].trim() ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        req.ip ||
        '0.0.0.0'
    );
}

function getUsuarioFromRequest(req) {
    return req.user?.nombre || req.user?.usuario || req.cookies?.usuario || 'Sistema';
}


async function auditar(req, accion, detalles = null) {
    const usuario = req.user?.nombre || req.body?.user || 'Sistema';
    const ip = getClientIp(req);
    await registrarAuditoria(usuario, ip, accion, detalles);
}

module.exports = {
    registrarAuditoria,
    getClientIp,
    getUsuarioFromRequest,
    auditar,
};