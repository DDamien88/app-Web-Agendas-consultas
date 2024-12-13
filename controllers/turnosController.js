// controllers/turnosController.js
const Turno = require('../models/Turno');
const Medico = require('../models/Medico');
const Paciente = require('../models/Paciente');
const Agenda = require('../models/Agenda');
const HorariosMedicos = require('../models/Horario');
const { esFeriado } = require('../config/feriados');
const db = require('../config/db');
const moment = require('moment');
require('moment/locale/es');
const pool = require('../config/db');
const Usuario = require('../models/Usuario');


// Configura el idioma a español
moment.locale('es');


// Obtener todos los turnos
exports.obtenerTurnos = async (req, res) => {
    try {
        const turnos = await Turno.obtenerTurnosConPacientes();

        // Formatear las fechas y el campo esSobreturno
        const turnosFormateados = turnos.map(turno => {
            return {
                ...turno,
                fechaFormateada: moment(turno.fecha).format('dddd, D [de] MMMM [de] YYYY'),
            };
        });

        res.render('turnos', { turnos: turnosFormateados });
    } catch (error) {
        console.error('Error al obtener turnos:', error);
        res.status(500).json({ error: 'Error al obtener turnos' });
    }
};




// Función para obtener horarios disponibles
const obtenerHorarios = async () => {
    const query = 'SELECT * FROM horarios_turnos';
    const [horarios] = await db.query(query);
    return horarios;
};

// Mostrar turnos disponibles por médico
exports.mostrarTurnosDisponibles = async (req, res) => {
    const { idMedico } = req.params;

    try {
        const turnosDisponibles = await Turno.obtenerTurnosDisponibles(idMedico);
        const medico = await Medico.getById(idMedico);

        res.render('turnosDisponibles', {
            turnos: turnosDisponibles,
            idMedico,
            nombreMedico: medico.nombre
        });
    } catch (error) {
        console.error('Error al obtener los turnos disponibles:', error);
        res.status(500).send('Error al obtener los turnos disponibles');
    }
};

// Mostrar el formulario para crear un turno
exports.mostrarCrearTurno = async (req, res) => {
    try {
        const medicos = await Medico.getAll();
        const pacientes = await Paciente.obtenerTodos();
        const horarios = await obtenerHorarios();

        res.render('crearTurno', { medicos, pacientes, horarios });
    } catch (error) {
        console.error('Error al cargar datos:', error);
        res.status(500).send('Error al cargar la página de creación de turnos');
    }
};

// Crear un nuevo turno
exports.crearTurno = async (req, res) => {
    const { fecha, hora, idMedico, idPaciente } = req.body;

    try {
        const fechaSeleccionada = new Date(fecha);

        // Verificar si es fin de semana o feriado
        if (fechaSeleccionada.getDay() === 5 || fechaSeleccionada.getDay() === 6) {
            return res.status(400).json({ error: 'No se pueden reservar turnos los fines de semana.' });
        }

        const fechaFormateada = fechaSeleccionada.toISOString().split('T')[0];
        if (esFeriado(fechaFormateada)) {
            return res.status(400).json({ error: 'No se pueden reservar turnos en feriados.' });
        }

        const disponibilidad = await Turno.verificarDisponibilidadTurno(idMedico, fecha, hora);
        if (!disponibilidad) {
            return res.status(400).json({ error: 'El horario seleccionado ya está reservado.' });
        }

        const horarioDisponible = await HorariosMedicos.verificarDisponibilidad(idMedico, hora);
        if (!horarioDisponible) {
            return res.status(400).json({ error: 'El horario seleccionado no está disponible.' });
        }

        const turnoExistente = await Turno.verificarTurnoExistente(idMedico, fechaFormateada, hora);
        if (turnoExistente) {
            return res.status(400).json({ error: 'Ya existe un turno reservado para este médico en la misma fecha y hora.' });
        }

        await Turno.crearTurno({ fecha, hora, idMedico, idPaciente, estado: 'Reservado' });
        res.redirect('/turnos');
    } catch (err) {
        console.error('Error al crear el turno:', err);
        res.status(500).json({ error: 'Error al crear el turno' });
    }
};

// Obtener todos los turnos
/*exports.obtenerTurnos = async (req, res) => {
    try {
        const turnos = await Turno.obtenerTurnosConPacientes();
        res.render('turnos', { turnos });
    } catch (error) {
        console.error('Error al obtener turnos:', error);
        res.status(500).json({ error: 'Error al obtener turnos' });
    }
};
*/
// Mostrar el formulario para asignar un paciente a un turno
exports.mostrarFormularioAsignarPaciente = async (req, res) => {
    const { idTurno } = req.params;
    try {
        const pacientes = await Paciente.obtenerPacientes();
        res.render('asignarPaciente', { idTurno, pacientes });
    } catch (error) {
        console.error('Error al obtener pacientes:', error);
        res.status(500).json({ error: 'Error al obtener pacientes' });
    }
};

// Asignar un paciente a un turno
exports.asignarPaciente = async (req, res) => {
    const { idTurno } = req.params;
    const { idPaciente } = req.body;

    try {
        await Turno.asignarPaciente(idTurno, idPaciente);
        res.redirect('/turnos');
    } catch (error) {
        console.error('Error al asignar paciente:', error);
        res.status(500).json({ error: 'Error al asignar paciente' });
    }
};

// Mostrar el formulario para asignar un turno a un médico
exports.mostrarFormularioAsignarTurno = async (req, res) => {
    const { idMedico } = req.params;

    try {
        const medico = await db.query('SELECT * FROM medicos WHERE idMedico = ?', [idMedico]);

        if (!medico[0]) {
            return res.status(404).send("Médico no encontrado");
        }

        res.render('asignarTurno', { medico: medico[0] });
    } catch (error) {
        console.error("Error al mostrar el formulario de asignación de turno:", error);
        res.status(500).send("Error al mostrar el formulario de asignación de turno");
    }
};

// Procesar la asignación de un turno
exports.asignarTurno = async (req, res) => {
    const { idHorario, idMedico, idPaciente, esSobreturno } = req.body;

    try {
        // Buscar el horario en la base de datos
        const [horario] = await db.query('SELECT * FROM horarios_agendas WHERE idHorario = ?', [idHorario]);

        if (horario.length > 0) {
            // Verificar si el horario está bloqueado
            if (horario[0].bloqueado === 1) {
                return res.status(400).send('No se puede asignar un turno a un horario bloqueado.');
            }

            if (horario[0].estado !== 'libre') {
                return res.status(400).send('El horario no está disponible. Solo se pueden asignar turnos en horarios libres.');
            }

            // Verificar si el horario ya tiene un turno reservado
            const [turnoReservado] = await db.query('SELECT * FROM turnos WHERE idHorario = ? AND estado = ?', [idHorario, 'Reservado']);
            if (turnoReservado.length > 0) {
                return res.status(400).send("El horario ya está reservado. No se puede asignar un turno.");
            }

            // Obtener la fecha y la hora del horario
            const fecha = horario[0].fecha;
            const hora = horario[0].horaInicio; // O la hora que necesites según la lógica

            // Insertar el turno en la tabla 'turnos'
            await db.query('INSERT INTO turnos (idMedico, fecha, hora, idPaciente, estado, esSobreturno, idHorario, ciudad) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [idMedico, fecha, hora, idPaciente, 'Reservado', esSobreturno ? 1 : 0, idHorario, 'San Luis']);

            // Actualizar el estado del horario en horarios_agendas a 'Reservado'
            await db.query('UPDATE horarios_agendas SET estado = ? WHERE idHorario = ?', ['Reservado', idHorario]);

            //return res.status(201).send('Turno asignado exitosamente');
            console.log('Turno asignado exitosamente');
            req.flash('success', 'Turno asignado con éxito.');
            res.redirect(`/horarios/${idMedico}`);
        } else {
            return res.status(404).send('Horario no encontrado');
        }
    } catch (error) {
        console.error('Error al asignar el turno:', error);
        req.flash('error', 'Error al asignar el turno: ' + error.message);
        return res.status(500).send('Error interno del servidor');
    }
};

exports.asignarTurnoVM = async (req, res) => {
    const { idHorario, idMedico, idPaciente, esSobreturno } = req.body;

    try {
        // Buscar el horario en la base de datos
        const [horario] = await db.query('SELECT * FROM horarios_agendas WHERE idHorario = ?', [idHorario]);

        if (horario.length > 0) {
            // Verificar si el horario está bloqueado
            if (horario[0].bloqueado === 1) {
                return res.status(400).send('No se puede asignar un turno a un horario bloqueado.');
            }

            // Verificar si el horario está libre
            if (horario[0].estado !== 'libre') {
                return res.status(400).send('El horario no está disponible. Solo se pueden asignar turnos en horarios libres.');
            }

            // Verificar si el horario ya tiene un turno reservado
            const [turnoReservado] = await db.query('SELECT * FROM turnos WHERE idHorario = ? AND estado = ?', [idHorario, 'Reservado']);
            if (turnoReservado.length > 0) {
                return res.status(400).send("El horario ya está reservado. No se puede asignar un turno.");
            }

            // fecha y la hora del horario
            const fecha = horario[0].fecha;
            const hora = horario[0].horaInicio;

            // Insertar el turno en la tabla 'turnos'
            await db.query('INSERT INTO turnos (idMedico, fecha, hora, idPaciente, estado, esSobreturno, idHorario, ciudad) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [idMedico, fecha, hora, idPaciente, 'Reservado', esSobreturno ? 1 : 0, idHorario, 'Villa Mercedes']);

            // Actualizar el estado del horario en horarios_agendas a 'Reservado'
            await db.query('UPDATE horarios_agendas SET estado = ? WHERE idHorario = ?', ['Reservado', idHorario]);

            //return res.status(201).send('Turno asignado exitosamente');
            console.log('Turno asignado exitosamente');
            req.flash('success', 'Turno asignado con éxito.');
            res.redirect(`/horarios/villa-mercedes/${idMedico}`);
        } else {
            return res.status(404).send('Horario no encontrado');
        }
    } catch (error) {
        console.error('Error al asignar el turno:', error);
        req.flash('error', 'Error al asignar el turno: ' + error.message);
        return res.status(500).send('Error interno del servidor');
    }
};

// Procesar la asignación de un turno
/*exports.asignarTurno = async (req, res) => {
    const { idHorario, idMedico, idPaciente, esSobreturno } = req.body;

    try {
        // Buscar el horario en la base de datos
        const [horario] = await db.query('SELECT * FROM horarios_agendas WHERE idHorario = ?', [idHorario]);

        if (horario.length > 0) {
            if (horario[0].bloqueado === 1) {
                return res.status(400).json({ success: false, message: 'No se puede asignar un turno a un horario bloqueado.' });
            }

            const [turnoReservado] = await db.query('SELECT * FROM turnos WHERE idHorario = ? AND estado = ?', [idHorario, 'Reservado']);
            if (turnoReservado.length > 0) {
                return res.status(400).json({ success: false, message: "El horario ya está reservado. No se puede asignar un turno." });
            }

            const fecha = horario[0].fecha;
            const hora = horario[0].horaInicio;
            await db.query('INSERT INTO turnos (idMedico, fecha, hora, idPaciente, estado, esSobreturno, idHorario) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [idMedico, fecha, hora, idPaciente, 'Reservado', esSobreturno ? 1 : 0, idHorario]);
            await db.query('UPDATE horarios_agendas SET estado = ? WHERE idHorario = ?', ['Reservado', idHorario]);

            return res.json({ success: true, message: 'Turno asignado exitosamente' });
        } else {
            return res.status(404).json({ success: false, message: 'Horario no encontrado' });
        }
    } catch (error) {
        console.error('Error al asignar el turno:', error);
        return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
};*/


// Crear sobreturno
exports.crearSobreturno = async (req, res) => {
    const { idMedico, fecha, hora, idPaciente, idHorario } = req.body;

    if (!idMedico || !fecha || !hora || !idPaciente || !idHorario) {
        console.log('Parámetros recibidos:', req.body);
        return res.status(400).json({ error: 'Faltan parámetros requeridos para crear un sobreturno.' });
    }

    try {
        const nuevoSobreturno = await Turno.crearSobreturno({ idMedico, fecha, hora, idPaciente });
        //res.status(201).json({ mensaje: 'Sobreturno creado exitosamente.', nuevoSobreturno });
        req.flash('success', 'Sobreturno creado con éxito.');
        res.redirect(`/horarios/${idMedico}`);
    } catch (error) {
        console.error('Error al crear sobreturno:', error);
        req.flash('error', 'Error al crear el sobreturno: ' + error.message);
        res.status(500).json({ error: error.message });
    }
};


// Obtener horarios de un médico incluyendo sobreturnos
exports.obtenerHorarios = async (req, res) => {
    const idMedico = req.params.idMedico;
    try {
        const query = `
            SELECT ha.*, m.nombre AS nombreMedico, 
            (SELECT COUNT(*) FROM turnos t WHERE t.idMedico = ha.idMedico AND t.fecha = ha.diaSemana AND t.esSobreturno = TRUE) AS sobreturnos
            FROM horarios_agendas ha 
            JOIN medicos m ON ha.idMedico = m.idMedico 
            WHERE ha.idMedico = ?`;

        const [horarios] = await db.query(query, [idMedico]);

        res.render('horarios', {
            horarios,
            nombreMedico: horarios.length > 0 ? horarios[0].nombreMedico : null
        });
    } catch (error) {
        console.error('Error al obtener los horarios:', error);
        res.status(500).send('Error al obtener los horarios');
    }
};

// Consultar turnos con filtros
exports.consultarTurnos = async (req, res) => {
    const { medico, fecha, estado } = req.query;
    let filtros = {};
    if (medico) filtros.idMedico = medico;
    if (fecha) filtros.fecha = fecha;
    if (estado) filtros.estado = estado;

    try {
        const turnos = await Turno.consultarTurnos(filtros);
        res.render('turnos', { turnos });
    } catch (error) {
        console.error('Error al consultar turnos:', error);
        res.status(500).send('Error al consultar turnos.');
    }
};

exports.cambiarEstadoTurno = async (req, res) => {
    const { idTurno } = req.params;
    const { estado } = req.body;

    console.log('ID Turno recibido:', idTurno);
    console.log('Estado recibido:', estado);

    // Validación del ID de turno
    if (!idTurno) {
        return res.status(400).json({ success: false, message: 'ID de turno inválido' });
    }

    const estadosPermitidos = ['cancelado', 'confirmado', 'atendido'];
    if (!estadosPermitidos.includes(estado)) {
        return res.status(400).json({ success: false, message: 'Estado inválido' });
    }


    try {
        // Verificar si el turno existe
        const turno = await Turno.obtenerTurnoPorId(idTurno);
        if (!turno) {
            return res.status(404).json({ success: false, message: 'Turno no encontrado' });
        }

        // Cambiar el estado del turno
        const result = await Turno.cambiarEstado(idTurno, estado);

        if (turno.idHorario) {
            const nuevoEstadoHorario = (estado === 'cancelado') ? 'libre' : estado;
            await db.query('UPDATE horarios_de_agendas SET estado = ? WHERE idHorario = ?', [nuevoEstadoHorario, turno.idHorario]);
        }

        // Verificar si la actualización fue exitosa
        if (result.affectedRows > 0) {
            return res.json({ success: true, message: `Estado cambiado a ${estado}` });
        } else {
            return res.json({ success: false, message: 'No se pudo cambiar el estado del turno' });
        }
    } catch (error) {
        console.error('Error al cambiar el estado del turno:', error);
        return res.status(500).json({ success: false, message: 'Error en el servidor' });
    }
};



exports.crearSobreturnoVM = async (req, res) => {
    const { idMedico, fecha, hora, idPaciente, idHorario } = req.body;

    if (!idMedico || !fecha || !hora || !idPaciente || !idHorario) {
        console.log('Parámetros recibidos:', req.body);
        return res.status(400).json({ error: 'Faltan parámetros requeridos para crear un sobreturno.' });
    }

    try {
        const nuevoSobreturno = await Turno.crearSobreturnoVM({ idMedico, fecha, hora, idPaciente });
        //res.status(201).json({ mensaje: 'Sobreturno creado exitosamente.', nuevoSobreturno });
        req.flash('success', 'Sobreturno creado con éxito.');
        res.redirect(`/horarios/villa-mercedes/${idMedico}`);
    } catch (error) {
        console.error('Error al crear sobreturno:', error);
        req.flash('error', 'Error al crear el sobreturno: ' + error.message);
        res.status(500).json({ error: error.message });
    }
};

/*exports.asignarTurnoDesdePac = async (req, res) => {
    const { idHorario, idMedico, idPaciente, esSobreturno } = req.body;
    console.log('Datos recibidos:', req.body);

    const missingFields = [];
    if (!idHorario) missingFields.push('idHorario');
    if (!idMedico) missingFields.push('idMedico');
    if (!idPaciente) missingFields.push('idPaciente');

    if (missingFields.length > 0) {
        return res.status(400).json({ error: `Faltan datos necesarios para asignar el turno: ${missingFields.join(', ')}` });
    }

    try {
        // Buscar el horario en la base de datos
        const [horario] = await db.query('SELECT * FROM horarios_agendas WHERE idHorario = ?', [idHorario]);

        if (horario.length === 0) {
            return res.status(404).json({ error: 'Horario no encontrado.' });
        }

        // Verificar si el horario está bloqueado
        if (horario[0].bloqueado === 1) {
            return res.status(400).json({ error: 'No se puede asignar un turno a un horario bloqueado.' });
        }

        // Verificar si el horario ya tiene un turno reservado
        const [turnoReservado] = await db.query('SELECT * FROM turnos WHERE idHorario = ? AND estado = ?', [idHorario, 'Reservado']);
        if (turnoReservado.length > 0) {
            return res.status(400).json({ error: 'El horario ya está reservado. No se puede asignar un turno.' });
        }

        // Obtener la fecha y la hora del horario
        const fecha = horario[0].fecha;
        const hora = horario[0].horaInicio; // O la hora que necesites según la lógica

        // Insertar el turno en la tabla 'turnos'
        await db.query('INSERT INTO turnos (idMedico, fecha, hora, idPaciente, estado, esSobreturno, idHorario, ciudad) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [idMedico, fecha, hora, idPaciente, 'Reservado', esSobreturno ? 1 : 0, idHorario, 'San Luis']);

        // Actualizar el estado del horario en horarios_agendas a 'Reservado'
        await db.query('UPDATE horarios_agendas SET estado = ? WHERE idHorario = ?', ['Reservado', idHorario]);

        console.log('Turno asignado exitosamente');
        req.flash('success', 'Turno asignado con éxito.');
        res.redirect(`/horarios/DesdePac/${idMedico}`);
    } catch (error) {
        console.error('Error al asignar el turno:', error);
        req.flash('error', 'Error al asignar el turno: ' + error.message);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
};*/

// Mostrar el formulario para reservar turno
exports.mostrarFormularioReservaTurno = async (req, res) => {
    const { fecha, hora } = req.query;
    console.log('Fecha:', fecha);
    console.log('Hora:', hora);

    const formattedFecha = fecha ? new Date(fecha).toLocaleDateString('es-AR') : ''; // Formatea la fecha
    console.log('Formatted Fecha:', formattedFecha); // Verifica el valor formateado

    try {
        const [medicos] = await pool.query('SELECT idMedico, nombre FROM medicos WHERE activo = 1');
        res.render('formReserva', { medicos, formattedFecha, hora });
    } catch (error) {
        console.error(error);
        res.render('formReserva', { medicos: [], formattedFecha, hora, mensajes: { error: 'Error al cargar los médicos' } });
    }
};




// Método para asignar el turno como rol paciente
/*exports.asignarTurnodesdePaciente = async (req, res) => {
    const { idMedico, idPaciente, fecha, hora, estado, ciudad, nombrePaciente } = req.body;

    try {
        // Verificar si el paciente existe
        const [paciente] = await pool.query('SELECT * FROM pacientes WHERE idPaciente = ?', [idPaciente]);

        // Si el paciente no existe, se deja idPaciente como null
        if (paciente.length === 0) {
            req.flash('error', 'El paciente no existe. Se registrará el turno sin paciente.');
            // Aquí no es necesario hacer nada con idPaciente, ya que se dejará como null en la consulta.
        }

        // Insertar el turno, dejando idPaciente como null si el paciente no existe
        await pool.query(
            'INSERT INTO turnos (idMedico, idPaciente, fecha, hora, estado, ciudad, nombrePaciente) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [idMedico, paciente.length > 0 ? idPaciente : null, fecha, hora, estado, ciudad, nombrePaciente]
        );

        req.flash('success', 'Turno reservado con éxito');
        res.send('Reserva realizada. A la brevedad nos comunicaremos con usted para confirmar su turno.');
    } catch (error) {
        console.error(error);
        req.flash('error', 'Error al reservar el turno');
        res.redirect('/turnos/formReserva');
    }
};*/

exports.asignarTurnoPacSL = async (req, res) => {
    const { idMedico, fecha, horaInicio, horaFin } = req.body;
    const idPaciente = req.session.idPaciente;

    console.log('Datos recibidos del formulario:', req.body);
    console.log('ID de Paciente desde sesión:', idPaciente);

    if (!idPaciente) {
        console.log('No hay ID de paciente en la sesión');
        req.flash('error', 'No estás autenticado.');
        return res.status(403).redirect('/loginPac');
    }

    // Verificación de datos requeridos
    if (!idMedico || !fecha || !horaInicio || !horaFin) {
        console.log('Error: faltan datos para asignar el turno.');
        req.flash('error', 'Faltan datos para asignar el turno.');
        return res.status(400).redirect(`/horarios/sanLuis/${idMedico}`);
    }

    try {
        // Obtener el paciente a partir del idPaciente de la sesión
        const paciente = await Paciente.obtenerPacientePorId(req.session.idPaciente);
        if (!paciente) {
            console.error('Paciente no encontrado para el idPaciente:', idPaciente);
            req.flash('error', 'Paciente no encontrado.');
            return res.status(404).redirect(`/horarios/sanLuis/${idMedico}`);
        }

        console.log('ID de Paciente obtenido:', idPaciente);

        const fechaFormateada = new Date(fecha).toISOString().split('T')[0];
        console.log('Fecha formateada:', fechaFormateada);

        const horaFormateada = horaInicio.length === 5 ? `${horaInicio}:00` : horaInicio;
        console.log('Hora formateada:', horaFormateada);



        // Verificar disponibilidad del horario
        const [horario] = await db.query(
            'SELECT * FROM horarios_agendas WHERE fecha = ? AND horaInicio = ? AND idMedico = ?',
            [fechaFormateada, horaFormateada, idMedico]
        );

        if (!horario || horario.length === 0) {
            console.log('Error: horario no encontrado.');
            req.flash('error', 'Horario no encontrado.');
            return res.status(404).redirect(`/horarios/sanLuis/${idMedico}`);
        }

        if (horario[0].bloqueado === 1) {
            console.log('Error: el horario está bloqueado.');
            req.flash('error', 'No se puede asignar un turno a un horario bloqueado.');
            return res.status(400).redirect(`/horarios/sanLuis/${idMedico}`);
        }

        // Comprobar si el horario ya tiene un turno reservado
        const [turnoReservado] = await db.query(
            'SELECT * FROM turnos WHERE idHorario = ? AND estado = ?',
            [horario[0].idHorario, 'Reservado']
        );
        if (turnoReservado.length > 0) {
            console.log('Error: el horario ya está reservado.');
            req.flash('error', 'El horario ya está reservado.');
            return res.status(400).redirect(`/horarios/sanLuis/${idMedico}`);
        }

        // Asignar el turno
        await db.query(
            'INSERT INTO turnos (idMedico, fecha, hora, idPaciente, estado, esSobreturno, idHorario, ciudad) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [idMedico, fecha, horaInicio, idPaciente, 'Reservado', 0, horario[0].idHorario, 'San Luis']
        );
        console.log('Turno asignado correctamente para el paciente:', idPaciente);

        // Actualizar el estado del horario a "Reservado"
        await db.query('UPDATE horarios_agendas SET estado = ? WHERE idHorario = ?', ['Reservado', horario[0].idHorario]);
        console.log('Estado del horario actualizado a "Reservado".');

        req.flash('success', 'Turno asignado correctamente.');
        //return res.redirect(`/horarios/sanLuis/${idMedico}`);
        return res.send('Turno asignado correctamente. A la brevedad nos comunicaremos con usted para confirmar su turno. Gracias por preferirnos');
        //return res.redirect('medicosSanLuisDesdePac');
    } catch (error) {
        console.error('Error inesperado al asignar el turno:', error);
        req.flash('error', 'Error al asignar el turno.');
        return res.status(500).redirect(`/horarios/sanLuis/${idMedico}`);
    }
};


exports.asignarTurnoPacVM = async (req, res) => {
    const { idMedico, fecha, horaInicio, horaFin } = req.body;
    const idPaciente = req.session.idPaciente;

    console.log('Datos recibidos del formulario:', req.body);
    console.log('ID de Paciente desde sesión:', idPaciente);

    if (!idPaciente) {
        console.log('No hay ID de paciente en la sesión');
        req.flash('error', 'No estás autenticado.');
        return res.status(403).redirect('/loginPac');
    }

    // Verificación de datos requeridos
    if (!idMedico || !fecha || !horaInicio || !horaFin) {
        console.log('Error: faltan datos para asignar el turno.');
        req.flash('error', 'Faltan datos para asignar el turno.');
        return res.status(400).redirect(`/horarios/villa-mercedes/Pac/${idMedico}`);
    }

    try {
        // Obtener el paciente a partir del idPaciente de la sesión
        const paciente = await Paciente.obtenerPacientePorId(req.session.idPaciente);
        if (!paciente) {
            console.error('Paciente no encontrado para el idPaciente:', idPaciente);
            req.flash('error', 'Paciente no encontrado.');
            return res.status(404).redirect(`/horarios/villa-mercedes/Pac/${idMedico}`);
        }

        console.log('ID de Paciente obtenido:', idPaciente);

        const fechaFormateada = new Date(fecha).toISOString().split('T')[0];
        console.log('Fecha formateada:', fechaFormateada);

        const horaFormateada = horaInicio.length === 5 ? `${horaInicio}:00` : horaInicio;
        console.log('Hora formateada:', horaFormateada);



        // Verificar disponibilidad del horario
        const [horario] = await db.query(
            'SELECT * FROM horarios_agendas WHERE fecha = ? AND horaInicio = ? AND idMedico = ?',
            [fechaFormateada, horaFormateada, idMedico]
        );

        if (!horario || horario.length === 0) {
            console.log('Error: horario no encontrado.');
            req.flash('error', 'Horario no encontrado.');
            return res.status(404).redirect(`/horarios/villa-mercedes/Pac/${idMedico}`);
        }

        if (horario[0].bloqueado === 1) {
            console.log('Error: el horario está bloqueado.');
            req.flash('error', 'No se puede asignar un turno a un horario bloqueado.');
            return res.status(400).redirect(`/horarios/villa-mercedes/Pac/${idMedico}`);
        }

        // Comprobar si el horario ya tiene un turno reservado
        const [turnoReservado] = await db.query(
            'SELECT * FROM turnos WHERE idHorario = ? AND estado = ?',
            [horario[0].idHorario, 'Reservado']
        );
        if (turnoReservado.length > 0) {
            console.log('Error: el horario ya está reservado.');
            req.flash('error', 'El horario ya está reservado.');
            return res.status(400).redirect(`/horarios/villa-mercedes/Pac/${idMedico}`);
        }

        // Asignar el turno
        await db.query(
            'INSERT INTO turnos (idMedico, fecha, hora, idPaciente, estado, esSobreturno, idHorario, ciudad) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [idMedico, fecha, horaInicio, idPaciente, 'Reservado', 0, horario[0].idHorario, 'Villa Mercedes']
        );
        console.log('Turno asignado correctamente para el paciente:', idPaciente);

        // Actualizar el estado del horario a "Reservado"
        await db.query('UPDATE horarios_agendas SET estado = ? WHERE idHorario = ?', ['Reservado', horario[0].idHorario]);
        console.log('Estado del horario actualizado a "Reservado".');

        req.flash('success', 'Turno asignado correctamente.');
        //return res.redirect(`/horarios/sanLuis/${idMedico}`);
        return res.send('Turno asignado correctamente. A la brevedad nos comunicaremos con usted para confirmar su turno. Gracias por preferirnos');
        //return res.redirect('medicosSanLuisDesdePac');
    } catch (error) {
        console.error('Error inesperado al asignar el turno:', error);
        req.flash('error', 'Error al asignar el turno.');
        return res.status(500).redirect(`/horarios/villa-mercedes/Pac/${idMedico}`);
    }
};
