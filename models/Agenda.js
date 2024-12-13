const db = require('../config/db');

const Agenda = {
    // Método para obtener las agendas filtradas
    async obtenerAgendasFiltradas(filtros) {
        let sql = `
            SELECT t.*, m.nombre AS nombreMedico, p.nombreCompleto AS nombrePaciente, e.nombreEspecialidad AS especialidad, t.esSobreturno
            FROM turnos t
            LEFT JOIN medicos m ON t.idMedico = m.idMedico
            LEFT JOIN pacientes p ON t.idPaciente = p.idPaciente
            LEFT JOIN medico_especialidad me ON m.idMedico = me.idMedico
            LEFT JOIN especialidad e ON me.idEspecialidad = e.idEspecialidad
            WHERE 1 = 1
        `;

        if (filtros.especialidad) {
            sql += ` AND e.nombreEspecialidad = '${filtros.especialidad}'`;
        }
        if (filtros.medico) {
            sql += ` AND t.idMedico = ${filtros.medico}`;
        }
        if (filtros.estado) {
            sql += ` AND t.estado = '${filtros.estado}'`;
        }
        if (filtros.dia) {
            sql += ` AND t.fecha = '${filtros.dia}'`;
        }

        const [resultados] = await db.query(sql);
        return resultados;
    },

    // Otros métodos relacionados con las agendas...
};

module.exports = Agenda;
