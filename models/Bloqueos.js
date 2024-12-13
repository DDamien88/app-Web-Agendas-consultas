// models/Bloqueos.js
const db = require('../config/db');

class Bloqueos {
    static async obtenerBloqueos(idMedico, fechaInicio, fechaFin) {
        const query = `
            SELECT *
            FROM bloqueosHorarios
            WHERE idMedico = ? AND fechaInicio >= ? AND fechaFin <= ?
        `;
        const [rows] = await db.query(query, [idMedico, fechaInicio, fechaFin]);
        return rows;
    }
}

module.exports = Bloqueos;
