// models/Horario.js
const db = require('../config/db');

const HorariosMedicos = {
    // Obtener todos los horarios
    getAll: async () => {
        try {
            const [rows] = await db.execute('SELECT * FROM horarios_agendas WHERE ciudad = ?', ['San Luis']);
            return rows;
        } catch (error) {
            console.error('Error al obtener los horarios:', error);
            throw new Error('Error del servidor al obtener los horarios');
        }
    },

    // Obtener horarios por médico y ciudad
    getByMedicoId: async (idMedico) => {
        const query = 'SELECT * FROM horarios_agendas WHERE idMedico = ? AND ciudad = ?';
        const [rows] = await db.query(query, [idMedico, 'San Luis']);
        return rows;
    },

    getByMedicoIdVM: async (idMedico) => {
        const query = 'SELECT * FROM horarios_agendas WHERE idMedico = ? AND ciudad = ?';
        const [rows] = await db.query(query, [idMedico, 'Villa Mercedes']);
        return rows;
    },

    getById: async (id) => {
        const query = 'SELECT nombre FROM medicos WHERE idMedico = ?';
        const result = await db.query(query, [id]);
        return result[0];
    },

    // Verificar disponibilidad por médico y hora
    verificarDisponibilidad: async (idMedico, hora) => {
        const query = `
            SELECT 1 FROM horarios_agendas 
            WHERE idMedico = ? AND ? BETWEEN horaInicio AND horaFin AND ciudad = ? LIMIT 1
        `;
        const [rows] = await db.execute(query, [idMedico, hora, 'San Luis']);
        return rows.length > 0;
    },

    // Crear un nuevo horario
    create: async (horario) => {
        const { idMedico, diaSemana, horaInicio, horaFin, duracion, estado, bloqueado, fecha, id_especialidad, ciudad } = horario;

        /*if (ciudad !== 'San Luis') {
            throw new Error('Solo se pueden crear horarios para la sucursal San Luis');
        }*/

        try {
            await db.execute(
                `INSERT INTO horarios_agendas (idMedico, diaSemana, horaInicio, horaFin, duracion, estado, bloqueado, fecha, id_especialidad, ciudad) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [idMedico, diaSemana, horaInicio, horaFin, duracion, estado, bloqueado, fecha, id_especialidad, ciudad]
            );
        } catch (error) {
            console.error('Error al crear el horario:', error);
            throw error;
        }
    }
};

module.exports = HorariosMedicos;
