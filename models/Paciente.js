// models/Paciente.js
const db = require('../config/db');

class Paciente {
    static async crearPaciente(data) {
        const { nombreCompleto, dni, motivoConsulta, obraSocial, datosContacto, documentoFotocopia, Activo } = data;
        const query = `
            INSERT INTO pacientes (nombreCompleto, dni, motivoConsulta, obraSocial, datosContacto, documentoFotocopia, Activo)
            VALUES (?, ?, ?, ?, ?, ?, ?)`;
        await db.query(query, [nombreCompleto, dni, motivoConsulta, obraSocial, datosContacto, documentoFotocopia, Activo]);
    }

    static async obtenerPacientePorId(idPaciente) {
        const query = 'SELECT * FROM pacientes WHERE idPaciente = ? AND Activo = 1';
        const [result] = await db.query(query, [idPaciente]);
        return result[0];
    }

    static async obtenerDetallePacientePorId(idPaciente) {
        const query = 'SELECT p.*, u.username AS usuario FROM pacientes p JOIN usuarios u ON u.id = p.idUsuario WHERE idPaciente = ?';
        const [result] = await db.query(query, [idPaciente]);
        return result[0];
    }


    // Cambia este método a estático
    static async getPacientes() {
        const query = 'SELECT * FROM pacientes where Activo = 1';
        const [result] = await db.query(query);
        return result;
    }

    static async actualizarPaciente(idPaciente, data) {
        const { nombreCompleto, dni, motivoConsulta, obraSocial, datosContacto, documentoFotocopia } = data;

        const query = `
            UPDATE pacientes
            SET nombreCompleto = ?, dni = ?, motivoConsulta = ?, obraSocial = ?, datosContacto = ?, documentoFotocopia = ?
            WHERE idPaciente = ?`;
        await db.query(query, [nombreCompleto, dni, motivoConsulta, obraSocial, datosContacto, documentoFotocopia, idPaciente]);
    }

    static async eliminarPaciente(idPaciente) {
        try {
            const pacienteQuery = 'UPDATE pacientes SET Activo = 0 WHERE idPaciente = ?';
            const [pacienteResult] = await db.query(pacienteQuery, [idPaciente]);

            if (pacienteResult.affectedRows === 0) {
                throw new Error('Paciente no encontrado en la base de datos');
            }

            const usuarioQuery = 'UPDATE usuarios SET Activo = 0 WHERE id = (SELECT idUsuario FROM pacientes WHERE idPaciente = ?)';
            const [usuarioResult] = await db.query(usuarioQuery, [idPaciente]);

            if (usuarioResult.affectedRows === 0) {
                console.log(`No se encontró el idUsuario correspondiente al paciente con idPaciente ${idPaciente} en la tabla usuarios`);
            }

        } catch (error) {
            console.error('Error al eliminar paciente:', error);
            throw error;
        }
    }

    // Activar Paciente
    static async activarPaciente(idPaciente) {
        try {
            const pacienteQuery = 'UPDATE pacientes SET Activo = 1 WHERE idPaciente = ?';
            const [pacienteResult] = await db.query(pacienteQuery, [idPaciente]);

            if (pacienteResult.affectedRows === 0) {
                throw new Error('Paciente no encontrado en la base de datos');
            }

            const usuarioQuery = 'UPDATE usuarios SET Activo = 1 WHERE id = (SELECT idUsuario FROM pacientes WHERE idPaciente = ?)';
            const [usuarioResult] = await db.query(usuarioQuery, [idPaciente]);

            if (usuarioResult.affectedRows === 0) {
                console.log(`No se encontró el idUsuario correspondiente al paciente con idPaciente ${idPaciente} en la tabla usuarios`);
            }

        } catch (error) {
            console.error('Error al activar paciente:', error);
            throw error;
        }
    }

    static async obtenerTurnosDelPaciente(idPaciente) {
        const query = `
            SELECT t.*, m.nombre AS nombreMedico
            FROM turnos t
            JOIN medicos m ON t.idMedico = m.idMedico
            WHERE t.idPaciente = ?`;
        const [turnos] = await db.query(query, [idPaciente]);
        return turnos;
    }

    static async obtenerPacientePorIdUsuario(idUsuario) {
        const query = 'SELECT * FROM pacientes WHERE idUsuario = ? AND Activo = 1';
        const [result] = await db.query(query, [idUsuario]);
        return result[0];
    }

    static async obtenerPorDNI(dni) {
        const query = 'SELECT * FROM pacientes WHERE dni = ?';
        const [result] = await db.query(query, [dni]);
        return result[0];
    }

    static async obtenerPacientePorIdPacSL(idUsuario) {
        try {
            const [paciente] = await db.query('SELECT * FROM pacientes WHERE idUsuario = ?', [idUsuario]);
            return paciente.length > 0 ? paciente[0] : null;
        } catch (error) {
            throw new Error('Error al obtener paciente: ' + error.message);
        }
    }

}

module.exports = Paciente;
