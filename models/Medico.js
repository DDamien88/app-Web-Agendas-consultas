// models/Medico.js
const db = require('../config/db');

const Medico = {
    getAll: async () => {
        const [rows] = await db.execute('SELECT * FROM medicos WHERE activo = 1');
        return rows;
    },

    getById: async (idMedico) => {
        try {
            const [rows] = await db.execute('SELECT * FROM medicos WHERE idMedico = ?', [idMedico]);
            return rows[0];
        } catch (error) {
            console.error(`Error al obtener médico con ID ${idMedico}:`, error);
            throw error;
        }
    },

    create: async (medico) => {
        const { nombre, especialidad } = medico;
        try {
            const [result] = await db.execute('INSERT INTO medicos (nombre, especialidad) VALUES (?, ?)', [nombre, especialidad]);
            return { idMedico: result.insertId, ...medico };
        } catch (error) {
            console.error('Error al crear médico:', error);
            throw error;
        }
    },

    update: async (idMedico, medico) => {
        const { nombre, especialidad } = medico;
        try {
            await db.execute('UPDATE medicos SET nombre = ?, especialidad = ? WHERE idMedico = ?', [nombre, especialidad, idMedico]);
            return { idMedico, ...medico };
        } catch (error) {
            console.error(`Error al actualizar médico con ID ${idMedico}:`, error);
            throw error;
        }
    },

    delete: async (idMedico) => {
        try {
            await db.execute('DELETE FROM medicos WHERE idMedico = ?', [idMedico]);
        } catch (error) {
            console.error(`Error al eliminar médico con ID ${idMedico}:`, error);
            throw error;
        }
    },

    getMedicosByCiudad: async (ciudad) => {
        const [rows] = await db.execute('SELECT * FROM medicos WHERE ciudad = ?', [ciudad]);
        return rows;
    },

    getBySucursal: async (sucursal) => {
        const [rows] = await db.execute('SELECT * FROM medicos WHERE sucursal = ?', [sucursal]);
        return rows;
    },

    // Método para obtener todos los médicos con sus especialidades
    async getMedicosConEspecialidades(sucursal = null) {
        let sql = `
            SELECT m.*, GROUP_CONCAT(e.nombreEspecialidad SEPARATOR ', ') AS especialidades
            FROM medicos m
            LEFT JOIN medico_especialidad me ON m.idMedico = me.idMedico
            LEFT JOIN especialidad e ON me.idEspecialidad = e.idEspecialidad
            LEFT JOIN medicos_sucursales ms ON m.idMedico = ms.idMedico
            LEFT JOIN sucursal s ON ms.idSucursal = s.idSucursal
            WHERE m.activo = 1
        `;

        const params = [];
        if (sucursal) {
            sql += ` AND s.nombre = ?`;
            params.push(sucursal);
        }

        sql += ` GROUP BY m.idMedico;`;

        const [resultados] = await db.query(sql, params);
        return resultados;
    },

    async getMedicosConEspecialidadesPorSucursal(nombreSucursal) {
        const sql = `
        SELECT m.*, 
        GROUP_CONCAT(e.nombreEspecialidad SEPARATOR ', ') AS especialidades
        FROM medicos m
        LEFT JOIN medico_especialidad me ON m.idMedico = me.idMedico
        LEFT JOIN especialidad e ON me.idEspecialidad = e.idEspecialidad
        JOIN medicos_sucursales ms ON m.idMedico = ms.idMedico
        JOIN sucursal s ON ms.idSucursal = s.idSucursal
        WHERE s.nombre = ? AND m.Activo = 1
        GROUP BY m.idMedico;
        `;

        const [resultados] = await db.query(sql, [nombreSucursal]);
        return resultados;
    },
};

module.exports = Medico;