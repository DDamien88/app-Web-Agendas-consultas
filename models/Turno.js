// models/Turno.js
const db = require('../config/db');

const Turno = {

    obtenerTurnoPorId: async (idTurno) => {
        const [result] = await db.execute('SELECT * FROM turnos WHERE idTurno = ?', [idTurno]);
        return result.length ? result[0] : null;
    },

    cambiarEstado: async (idTurno, estado) => {
        const [result] = await db.execute('UPDATE turnos SET estado = ? WHERE idTurno = ?', [estado, idTurno]);
        return result;
    },

    // Verificar si ya existe un turno en la misma fecha, hora y médico
    verificarTurnoExistente: async (idMedico, fecha, hora) => {
        const query = `
        SELECT COUNT(*) as existe
        FROM turnos
        WHERE idMedico = ? AND fecha = ? AND hora = ? AND estado = 'Reservado' OR estado = 'atendido' OR estado = 'confirmado'`;

        const [rows] = await db.query(query, [idMedico, fecha, hora]);
        return rows[0].existe > 0;
    },


    contarSobreturnos: async (idMedico, fecha) => {
        const query = `
            SELECT COUNT(*) as total
            FROM turnos
            WHERE idMedico = ? AND fecha = ? AND esSobreturno = TRUE`;
        const [rows] = await db.query(query, [idMedico, fecha]);
        return rows[0].total;
    },


    crearTurno: async (req, res) => {
        const { fecha, hora, idMedico, idPaciente, idHorario } = req.body;
        const fechaSeleccionada = new Date(fecha);

        try {
            const horarioDisponible = await HorariosMedicos.verificarDisponibilidadPorFecha(idMedico, fechaSeleccionada, hora);
            if (!horarioDisponible) {
                return res.status(400).json({ error: 'El horario seleccionado no está disponible.' });
            }

            await Turno.crearTurno({ fecha, hora, idMedico, idPaciente, idHorario, estado: 'Reservado' });
            res.redirect('/turnos');
        } catch (err) {
            console.error('Error al crear el turno:', err);
            res.status(500).json({ error: 'Error al crear el turno' });
        }
    },



    // Función para obtener todos los turnos
    obtenerTurnosConPacientes: async () => {
        const query = `
            SELECT t.fecha, t.hora, 
                p.nombreCompleto AS paciente, 
                m.nombre AS medico, 
                t.estado, 
                t.esSobreTurno, 
                t.idSucursal,
                t.idTurno,
                t.clasificacion,
                s.nombre AS sucursal,
                p.dni
            FROM turnos t
            LEFT JOIN pacientes p ON t.idPaciente = p.idPaciente
            LEFT JOIN medicos m ON t.idMedico = m.idMedico
            LEFT JOIN horarios_de_agendas h ON t.idHorario = h.idHorario
            JOIN sucursal s ON s.idSucursal = t.idSucursal
        `;
        const [rows] = await db.query(query);
        return rows;
    },


    // Obtener turnos por médico
    obtenerTurnosPorMedico: async (idMedico) => {
        const query = `
            SELECT * 
            FROM turnos 
            WHERE idMedico = ? AND estado != 'Cancelado'; // Filtrar turnos cancelados
        `;

        const [rows] = await db.query(query, [idMedico]);
        return rows;
    },

    // Función para asignar un paciente a un turno
    asignarPaciente: async (idTurno, idPaciente) => {
        const query = 'UPDATE turnos SET idPaciente = ? WHERE idTurno = ?';
        console.log('ID del Turno:', idTurno);
        console.log('ID del Paciente:', idPaciente);

        try {
            await db.query(query, [idPaciente, idTurno]);
        } catch (error) {
            console.error('Error al asignar paciente al turno:', error);
            throw error;
        }
    },


    // Función para obtener los turnos disponibles
    obtenerTurnosDisponibles: async (idMedico) => {
        const query = `
            SELECT ht.dia, ht.hora
            FROM horarios_turnos ht
            LEFT JOIN turnos t ON ht.dia = DATE(t.fecha) AND ht.hora = t.hora AND ht.idMedico = t.idMedico
            WHERE t.idTurno IS NULL AND ht.idMedico = ?;
        `;
        const [rows] = await db.execute(query, [idMedico]);
        return rows;
    },

    verificarDisponibilidadTurno: async (idMedico, fecha, hora) => {
        const query = `
            SELECT 1 FROM turnos 
            WHERE idMedico = ? AND fecha = ? AND hora = ? LIMIT 1;
        `;
        const [rows] = await db.execute(query, [idMedico, fecha, hora]);
        return rows.length === 0;  // Devuelve true si el turno no está reservado
    },

    // Función para crear un sobreturno
    crearSobreturno: async (turno) => {
        const { fecha, hora, idMedico, idPaciente } = turno;

        // Verifica si ya se alcanzó el límite de 3 sobreturnos
        const cantidadSobreturnos = await Turno.contarSobreturnos(idMedico, fecha);
        if (cantidadSobreturnos >= 3) {
            throw new Error('No se pueden asignar más de 3 sobreturnos por día.');
        }

        // Verifica si el turno está reservado (puede compartir horario con un sobreturno)
        const turnoReservado = await Turno.verificarTurnoExistente(idMedico, fecha, hora);
        if (!turnoReservado) {
            throw new Error('El sobreturno solo se puede asignar si el horario ya está reservado.');
        }

        // Si cumple con las condiciones, crea el sobreturno
        const [result] = await db.execute(
            'INSERT INTO turnos (fecha, hora, idMedico, idPaciente, estado, esSobreturno, ciudad) VALUES (?, ?, ?, ?, ?, 1, ?)',
            [fecha, hora, idMedico, idPaciente, 'Reservado', 'San Luis']
        );

        return { idTurno: result.insertId, ...turno };
    },

    // Función para crear un sobreturno VM

    crearSobreturnoVM: async (turno) => {
        const { fecha, hora, idMedico, idPaciente } = turno;

        // Verifica si ya se alcanzó el límite de 3 sobreturnos
        const cantidadSobreturnos = await Turno.contarSobreturnos(idMedico, fecha);
        if (cantidadSobreturnos >= 3) {
            throw new Error('No se pueden asignar más de 3 sobreturnos por día.');
        }

        // Verifica si el turno está reservado (puede compartir horario con un sobreturno)
        const turnoReservado = await Turno.verificarTurnoExistente(idMedico, fecha, hora);
        if (!turnoReservado) {
            throw new Error('El sobreturno solo se puede asignar si el horario ya está reservado.');
        }

        // Si cumple con las condiciones, crea el sobreturno
        const [result] = await db.execute(
            'INSERT INTO turnos (fecha, hora, idMedico, idPaciente, estado, esSobreturno, ciudad) VALUES (?, ?, ?, ?, ?, 1, ?)',
            [fecha, hora, idMedico, idPaciente, 'Reservado', 'Villa Mercedes']
        );

        return { idTurno: result.insertId, ...turno };
    },
};
module.exports = Turno;
