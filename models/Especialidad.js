// models/Especialidad.js
const db = require('../config/db'); 

const obtenerEspecialidades = async (idMedico) => {
    const query = `
        SELECT e.nombreEspecialidad 
        FROM especialidad e
        JOIN medico_especialidad me ON me.idEspecialidad = e.idEspecialidad
        WHERE me.idMedico = ? AND me.sucursal = 'San Luis';
    `;
    
    try {
        const [especialidades] = await db.query(query, [idMedico]);
        return especialidades;
    } catch (error) {
        console.error('Error al obtener especialidades:', error);
        throw error;
    }
};

const obtenerEspecialidadesVM = async (idMedico) => {
    const query = `
        SELECT e.nombreEspecialidad 
        FROM especialidad e
        JOIN medico_especialidad me ON me.idEspecialidad = e.idEspecialidad
        WHERE me.idMedico = ? AND me.sucursal = 'Villa Mercedes';
    `;
    
    try {
        const [especialidades] = await db.query(query, [idMedico]);
        return especialidades;
    } catch (error) {
        console.error('Error al obtener especialidades:', error);
        throw error;
    }
};

module.exports = { obtenerEspecialidades, obtenerEspecialidadesVM };
