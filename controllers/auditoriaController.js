const AuditoriaModel = require('../models/auditoriaModel');
const { ok, fail } = require('../utils/Response');

exports.obtenerAuditoria = async (req, res) => {
    try {
        const { usuario, desde, hasta, q, limit = 500, offset = 0 } = req.query;

        const filtros = {
            usuario: usuario || null,
            desde: desde || null,
            hasta: hasta || null,
            q: q || null,
            limit: Number(limit),
            offset: Number(offset),
        };

        const [rows, total] = await Promise.all([
            AuditoriaModel.listarAuditoria(filtros),
            AuditoriaModel.contarAuditoria(filtros),
        ]);

        return ok(res, { rows, total, limit: filtros.limit, offset: filtros.offset });
    } catch (error) {
        console.error('❌ Error al obtener auditoría:', error);
        return fail(res, 'Error al obtener la auditoría', 500, error.message);
    }
};