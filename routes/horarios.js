// routes/horarios.js
const express = require('express');
const router = express.Router();
const horariosController = require('../controllers/horariosController');
const db = require('../config/db');
const { format, addDays, addMinutes, parseISO } = require('date-fns');
const { esFeriado } = require('../config/feriados');
const { ro } = require('date-fns/locale');

//router.get('/planificar', horariosController.mostrarPlanificarAgenda);
router.get('/crear/agenda', horariosController.mostrarCrearAgenda);
router.post('/crear/agenda', horariosController.crearAgenda);


router.get('/especialidades', horariosController.obtenerEspecialidadesPorSucursal);
router.get('/medicos', horariosController.obtenerMedicosPorSucursalYEspecialidad);

//router.post('/planificar', horariosController.agregarHorarioPlanificado);
router.get('/planificar', horariosController.mostrarCrearHorarios);
router.post('/planificar', horariosController.planificarHorarios);

router.get('/disponibles', async (req, res) => {
    try {
        const [horariosDisponibles] = await db.query('SELECT * FROM horarios_agendas');
        const [medicos] = await db.query('SELECT * FROM medicos WHERE activo = 1');

        res.render('horariosDisponibles', {
            medicos,
            horariosDisponibles
        });
    } catch (error) {
        console.error('Error al obtener los horarios o médicos:', error);
        res.status(500).send('Error interno del servidor');
    }
});


router.post('/disponibles', horariosController.mostrarHorariosDisponibles);

//Como paciente!!!
router.get('/libresComoPac', horariosController.verHorariosDisponiblesComoPac);
router.post('/libresComoPac', horariosController.filtrarHorariosDisponiblesComoPac);
router.post('/reservarComoPac', horariosController.reservarTurnosComoPac);

//router.get('/libres', horariosController.verHorariosDisponiblesDesdeAdmision);
//router.post('/libres', horariosController.filtrarHorariosDisponiblesDesdeAdmision);

// Versión de turnos y horarios disponibles que funciona
router.get('/libres', async (req, res) => {
    const { sucursal, especialidad } = req.query;

    try {
        // Consultar pacientes
        const [pacientes] = await db.query(
            'SELECT idPaciente, nombreCompleto, dni FROM pacientes'
        );

        // Consultar sucursales (siempre disponibles)
        const [sucursales] = await db.query(
            'SELECT idSucursal, nombre FROM sucursal'
        );

        // Consultar especialidades y médicos solo si hay sucursal seleccionada
        let especialidades = [];
        let medicos = [];
        if (sucursal) {
            [especialidades] = await db.query(
                `SELECT DISTINCT e.idEspecialidad, e.nombreEspecialidad
                FROM medico_especialidad me
                JOIN especialidad e ON me.idEspecialidad = e.idEspecialidad
                WHERE me.idSucursal = ?`,
                [sucursal]
            );

            if (especialidad) {
                [medicos] = await db.query(
                    `SELECT DISTINCT m.idMedico, m.nombre
                    FROM medico_especialidad me
                    JOIN medicos m ON me.idMedico = m.idMedico
                    WHERE me.idSucursal = ? AND me.idEspecialidad = ?`,
                    [sucursal, especialidad]
                );
            }
        }

        // Renderizar la vista con los datos obtenidos
        res.render('horariosLibres', {
            sucursales,
            especialidades,
            medicos,
            pacientes,
            horarios: [], // No se han cargado horarios aún
            success: null,
            error: null,
            filtros: { sucursal, especialidad }, // Mantener filtros seleccionados
        });
    } catch (error) {
        console.error('Error al cargar datos:', error);
        res.status(500).send('Hubo un problema al cargar la página.');
    }
});


router.get('/pacientes', async (req, res) => {
    const { filtro } = req.query;

    try {
        if (!filtro || filtro.trim() === '') {
            // Devuelve un array vacío si no hay filtro
            return res.json([]);
        }

        const query = `
            SELECT idPaciente, nombreCompleto, dni 
            FROM pacientes
            WHERE nombreCompleto LIKE ? OR dni LIKE ?
        `;
        const [pacientes] = await db.query(query, [`%${filtro}%`, `%${filtro}%`]);
        res.json(pacientes);
    } catch (error) {
        console.error('Error al cargar pacientes:', error);
        res.status(500).json({ error: 'Error al cargar pacientes' });
    }
});




router.get('/especialidades', async (req, res) => {
    const { sucursal } = req.query;

    try {
        const [especialidades] = await db.query(
            `SELECT DISTINCT e.idEspecialidad, e.nombreEspecialidad
                FROM medico_especialidad me
                JOIN especialidad e ON me.idEspecialidad = e.idEspecialidad
                WHERE me.idSucursal = ?`,
            [sucursal]
        );
        console.log('Especialidades:', especialidades);
        res.json(especialidades);
    } catch (error) {
        console.error('Error al cargar especialidades:', error);
        res.status(500).json({ error: 'Hubo un problema al cargar las especialidades.' });
    }
});

router.get('/medicos', async (req, res) => {
    const { sucursal, especialidad } = req.query;

    try {
        const [medicos] = await db.query(
            `SELECT DISTINCT m.idMedico, m.nombre
                FROM medico_especialidad me
                JOIN medicos m ON me.idMedico = m.idMedico
                WHERE me.idSucursal = ? AND me.idEspecialidad = ?`,
            [sucursal, especialidad]
        );

        res.json(medicos);
    } catch (error) {
        console.error('Error al cargar médicos:', error);
        res.status(500).json({ error: 'Hubo un problema al cargar los médicos.' });
    }
});


// versión que funciona desde un principio
router.post('/libres', async (req, res) => {
    const { idSucursal, idEspecialidad, idMedico, año, mes } = req.body;
    try {
        // Cargar sucursales para el formulario
        const [sucursales] = await db.query('SELECT idSucursal, nombre FROM sucursal');

        if (!idSucursal || !idEspecialidad || !idMedico || !año || !mes) {
            return res.render('horariosLibres', {
                horarios: [],
                sucursales,
                especialidades: [],
                medicos: [],
                success: null,
                error: 'Por favor, complete todos los filtros.',
                filtros: { idSucursal, idEspecialidad, idMedico, año, mes }
            });
        }

        // Cargar especialidades según la sucursal seleccionada
        const [especialidades] = await db.query(
            `SELECT DISTINCT e.idEspecialidad, e.nombreEspecialidad
                FROM medico_especialidad me
                JOIN especialidad e ON me.idEspecialidad = e.idEspecialidad
                WHERE me.idSucursal = ?`,
            [idSucursal]
        );

        // Cargar médicos según especialidad y sucursal seleccionadas
        const [medicos] = await db.query(
            `SELECT DISTINCT m.idMedico, m.nombre
                FROM medico_especialidad me
                JOIN medicos m ON me.idMedico = m.idMedico
                WHERE me.idSucursal = ? AND me.idEspecialidad = ?`,
            [idSucursal, idEspecialidad]
        );

        // Filtrar horarios disponibles excluyendo las fechas bloqueadas
        const [horarios] = await db.query(
            `SELECT 
                h.idHorario,
                h.fecha, 
                h.horaInicio, 
                h.horaFin, 
                m.nombre AS nombreMedico, 
                s.nombre AS sucursal
                FROM 
                horarios_de_agendas h
                JOIN 
                agendas_medicos am ON h.agenda = am.idAgenda
                JOIN 
                medicos m ON am.idMedico = m.idMedico
                JOIN 
                medico_especialidad me ON m.idMedico = me.idMedico
                JOIN 
                sucursal s ON me.idSucursal = s.idSucursal
                LEFT JOIN 
                bloqueos_agenda b ON b.idMedico = am.idMedico 
                AND b.idSucursal = me.idSucursal 
                AND h.fecha BETWEEN b.fechaInicio AND b.fechaFin
                WHERE 
                h.estado = 'libre' AND h.esSobreturno = 0
                AND me.idSucursal = ?
                AND me.idEspecialidad = ?
                AND am.idMedico = ?
                AND YEAR(h.fecha) = ?
                AND MONTH(h.fecha) = ?
                AND b.idBloqueo IS NULL`,
            [idSucursal, idEspecialidad, idMedico, año, mes]
        );

        // Filtrar horarios para excluir feriados
        const horariosFiltrados = horarios.filter(horario => {
            const fechaISO = new Date(horario.fecha).toISOString().split('T')[0];
            return !esFeriado(fechaISO);
        });

        res.render('horariosLibres', {
            horarios: horariosFiltrados,
            sucursales,
            especialidades,
            medicos,
            success: 'Horarios filtrados correctamente.',
            error: null,
            filtros: { idSucursal, idEspecialidad, idMedico, año, mes }
        });
    } catch (error) {
        console.error('Error al cargar horarios:', error);
        const [sucursales] = await db.query('SELECT idSucursal, nombre FROM sucursal');
        res.render('horariosLibres', {
            horarios: [],
            sucursales,
            especialidades: [],
            medicos: [],
            success: null,
            error: 'Hubo un problema al cargar los horarios.',
            filtros: { idSucursal, idEspecialidad, idMedico, año, mes }
        });
    }
});




router.post('/reservar', async (req, res) => {
    const { idMedico, horaInicio, fecha, idPaciente, idSucursal, clasificacion, idHorario, esSobreturno } = req.body;
    console.log('Datos recibidos:', req.body);

    const fechaParts = fecha.split('/');
    const fechaConvertida = `${fechaParts[2]}-${fechaParts[1]}-${fechaParts[0]}`;

    // Verificar si es sobreturno
    const esSobreturnoNumber = esSobreturno === true ? 1 : 0;
    console.log('esSobreturno convertido a número:', esSobreturnoNumber);

    // Calcular el ID del horario base
    let idHorarioBase = idHorario;
    console.log('ID del horario base:', idHorarioBase);

    // Buscar el horario base correspondiente
    if (esSobreturnoNumber === 1) {
        const [horarioBase] = await db.query(`
        SELECT idHorario
        FROM horarios_de_agendas
        WHERE fecha = ?
            AND horaInicio = ?
            AND esSobreTurno = 0
            AND estado = 'reservado'
        LIMIT 1
    `, [fechaConvertida, horaInicio]);

        console.log('Resultado del horario base:', horarioBase);

        if (!horarioBase || horarioBase.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No se puede reservar un sobreturno porque el horario base no está reservado.'
            });
        }

        // Confirmar que el horario base está reservado
        /*const { estado, esSobreTurno } = horarioBase[0];
        if (estado !== 0 || esSobreTurno !== 0) {
            console.log('Horario base no reservado:', horarioBase);
            return res.status(400).json({
                success: false,
                error: 'El horario base no está reservado, por lo que no se puede asignar un sobreturno.'
            });
        }*/

        // El horario base será el ID encontrado
        idHorarioBase = horarioBase[0].idHorario;
        console.log('ID del horario base:', idHorarioBase);
    }



    // Si todo es válido, proceder con la reserva del turno
    try {
        const query = `
            INSERT INTO turnos 
            (idMedico, fecha, hora, idPaciente, estado, esSobreTurno, idHorario, idSucursal, clasificacion) 
            VALUES (?, ?, ?, ?, 'reservado', ?, ?, ?, ?)
        `;
        const params = [
            idMedico,
            fechaConvertida,
            horaInicio,
            idPaciente,
            esSobreturnoNumber,
            idHorario,
            idSucursal,
            clasificacion
        ];

        await db.query(query, params);

        // Actualizar el estado del horario reservado
        await db.query('UPDATE horarios_de_agendas SET estado = "reservado" WHERE idHorario = ?', [idHorario]);

        res.json({ success: true, message: 'Turno reservado con éxito.' });
    } catch (error) {
        console.error('Error al reservar:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            res.status(409).json({
                success: false,
                error: 'El turno ya está reservado. Por favor, elija otro horario.'
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Ocurrió un error al procesar la reserva. Intente nuevamente.'
            });
        }
    }
});







// Versión 2
// app.post('/horarios/reservar', async (req, res) => {
//     const { idMedico, fecha, horaInicio, idPaciente, idSucursal, clasificacion, idHorario, esSobreTurno } = req.body;

//     try {
//         // Verificar si es sobreturno
//         if (esSobreTurno) {
//             const horario = await db.query(`
//                 SELECT COUNT(CASE WHEN esSobreTurno = 1 THEN 1 END) AS totalSobreturnos, cantSobreTurnos
//                 FROM turnos t
//                 JOIN horarios_de_agendas h ON t.idHorario = h.idHorario
//                 JOIN agendas_medicos am ON h.agenda = am.idAgenda
//                 WHERE h.idHorario = ?
//             `, [idHorario]);

//             if (horario[0].totalSobreturnos >= horario[0].cantSobreTurnos) {
//                 return res.status(400).json({ error: 'Límite de sobreturnos alcanzado.' });
//             }
//         }

//         // Crear el turno
//         await db.query(`
//             INSERT INTO turnos (idHorario, idPaciente, clasificacion, esSobreTurno)
//             VALUES (?, ?, ?, ?)
//         `, [idHorario, idPaciente, clasificacion, esSobreTurno ? 1 : 0]);

//         res.json({ success: true, message: 'Reserva realizada con éxito.' });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: 'Error al realizar la reserva.' });
//     }
// });

router.get('/sobreturnos', horariosController.obtenerSobreturnos);






















// Ruta para mostrar el formulario de creación de horario
router.get('/agregar', horariosController.formCrearHorario);

// Ruta para procesar el formulario de creación de horario
router.post('/agregar', horariosController.agregarHorario);

//router.get('/:idMedico', horariosController.mostrarHorarios);
router.get('/:idMedico', horariosController.mostrarHorariosSanLuis);

// Mostrar todos los horarios (vista general con médicos y pacientes)
//router.get('/', horariosController.obtenerHorarios);
router.get('/desdePac/:idMedico', horariosController.mostrarHorariosDesdePac);

// Ruta para insertar nuevos horarios en horarios_turnos
router.post('/nuevo', horariosController.insertarHorariosTurnos);

//router.post('/bloquear/:idHorario', horariosController.bloquearHorario);

// Ruta para bloquear un horario
router.post('/bloquear/:idHorario', horariosController.bloquearHorario);
router.post('/bloquear/villa-mercedes/:idHorario', horariosController.bloquearHorarioVM);


// Ruta para crear un nuevo horario (horarios_agendas)
//router.post('/nuevo-horario', horariosController.crearHorario);

// Ruta para obtener horarios de Villa Mercedes
router.get('/villa-mercedes/:idMedico', horariosController.obtenerHorariosVillaMercedes);
router.get('/villa-mercedes/Pac/:idMedico', horariosController.obtenerHorariosVillaMercedesDesdePac);

router.get('/sanLuis/:idMedico', horariosController.obtenerHorariosSLPac);

// Ruta para crear un sobreturno
//router.post('/sobreturno', horariosController.crearSobreturno);
module.exports = router;
