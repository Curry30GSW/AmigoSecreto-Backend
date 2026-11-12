const pool = require('../config/ConectDb');

class Deseo {
    static async perteneceAUsuario(id, cedula) {
        const [rows] = await pool.query(
            `SELECT d.id
             FROM deseos d
             JOIN participantes p ON p.id = d.participante_id
             WHERE d.id = ? AND p.cedula = ?
             LIMIT 1`,
            [id, cedula]
        );
        return rows.length > 0;
    }

    static async findByParticipante(participanteId) {
        const [rows] = await pool.query(
            'SELECT * FROM deseos WHERE participante_id = ? ORDER BY creado_en ASC',
            [participanteId]
        );
        return rows;
    }

    static async create({ participante_id, descripcion }) {
        const [result] = await pool.query(
            `INSERT INTO deseos (participante_id, descripcion) VALUES (?, ?)`,
            [participante_id, descripcion]
        );
        const [rows] = await pool.query('SELECT * FROM deseos WHERE id = ?', [result.insertId]);
        return rows[0];
    }

    static async update(id, { descripcion, comprado }) {
        const campos = [];
        const valores = [];
        if (descripcion !== undefined) { campos.push('descripcion = ?'); valores.push(descripcion); }
        if (comprado !== undefined) { campos.push('comprado = ?'); valores.push(comprado ? 1 : 0); }
        if (!campos.length) return false;
        valores.push(id);
        const [r] = await pool.query(
            `UPDATE deseos SET ${campos.join(', ')} WHERE id = ?`,
            valores
        );
        return r.affectedRows > 0;
    }

    static async delete(id) {
        const [r] = await pool.query('DELETE FROM deseos WHERE id = ?', [id]);
        return r.affectedRows > 0;
    }

    static async deleteByParticipante(participanteId) {
        await pool.query('DELETE FROM deseos WHERE participante_id = ?', [participanteId]);
    }
}

module.exports = Deseo;