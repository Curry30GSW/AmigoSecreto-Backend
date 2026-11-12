const pool = require('../config/ConectDb');

class Dulce {
    static async perteneceAUsuario(id, cedula) {
        const [rows] = await pool.query(
            `SELECT d.id
             FROM dulces d
             JOIN participantes p ON p.id = d.participante_id
             WHERE d.id = ? AND p.cedula = ?
             LIMIT 1`,
            [id, cedula]
        );
        return rows.length > 0;
    }

    static async findByParticipante(participanteId) {
        const [rows] = await pool.query(
            'SELECT * FROM dulces WHERE participante_id = ? ORDER BY creado_en ASC',
            [participanteId]
        );
        return rows;
    }

    static async create({ participante_id, descripcion }) {
        const [result] = await pool.query(
            `INSERT INTO dulces (participante_id, descripcion) VALUES (?, ?)`,
            [participante_id, descripcion]
        );
        const [rows] = await pool.query('SELECT * FROM dulces WHERE id = ?', [result.insertId]);
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
            `UPDATE dulces SET ${campos.join(', ')} WHERE id = ?`,
            valores
        );
        return r.affectedRows > 0;
    }

    static async delete(id) {
        const [r] = await pool.query('DELETE FROM dulces WHERE id = ?', [id]);
        return r.affectedRows > 0;
    }

    static async deleteByParticipante(participanteId) {
        await pool.query('DELETE FROM dulces WHERE participante_id = ?', [participanteId]);
    }
}

module.exports = Dulce;