// routes/turnos.js
const express = require('express');
const router = express.Router();
const turnosController = require('../controllers/turnosController');
const { isAuthenticated } = require('../middlewares/auth');
const db = require('../config/db');
const moment = require('moment');

// Mostrar la lista de turnos
router.get('/', turnosController.obtenerTurnos);
//router.get('/', turnosController.consultarTurnos);

// Ruta para cambiar el estado del turno
router.post('/:idTurno/cambiarEstado', turnosController.cambiarEstadoTurno);

router.get('/nuevo', turnosController.mostrarCrearTurno);
router.post('/reservar', turnosController.crearTurno);

router.get('/disponibles/:idMedico', turnosController.mostrarTurnosDisponibles);

router.post('/sobreturno', turnosController.crearSobreturno);
router.post('/sobreturno/VM', turnosController.crearSobreturnoVM);

router.get('/asignarPaciente/:idTurno', turnosController.mostrarFormularioAsignarPaciente);
router.post('/asignarPaciente/:idTurno', turnosController.asignarPaciente);

// Ruta para mostrar el formulario de asignación de turno
router.get('/asignar/:idMedico', turnosController.mostrarFormularioAsignarTurno);
router.post('/asignar', turnosController.asignarTurno);
router.post('/asignar/Pac', turnosController.asignarTurnoPacSL);
router.post('/asignar/PacVM', turnosController.asignarTurnoPacVM);
router.post('/asignar/VM', turnosController.asignarTurnoVM);
//router.post('/asignarDesdePac', turnosController.asignarTurnoDesdePac);

/*router.get('/formReserva', turnosController.mostrarFormularioReservaTurno);
router.post('/asignarPac', turnosController.asignarTurnodesdePaciente);*/


// Mostrar el formulario de asignación de turno
/*router.get('/asignarComoTal', isAuthenticated, (req, res) => {
    const paciente = req.user; // Obtenemos el usuario autenticado
    res.render('asignarTurnoComoPac', { paciente });
});*/

// Manejar la asignación de un turno como Paciente
/*router.post('/asignarComoTal', isAuthenticated, async (req, res) => {
    const { fecha, hora } = req.body;
    const pacienteId = req.user.id;

    try {
        // Guardar el turno en la base de datos
        await pool.query(
            'INSERT INTO turnos (idPaciente, fecha, hora, estado) VALUES ( ?, ?, ?, ?)',
            [pacienteId, fecha, hora, 'reservado']
        );
        
        res.redirect('/dashboard');
    } catch (error) {
        console.error(error);
        res.render('asignarTurnoComoPac', { paciente: req.user, messages: { error: 'Error al asignar el turno' } });
    }
});*/



router.get('/turnos-confirmados', async (req, res, next) => {
    if (!req.session.idMedico) {
        return res.redirect('/loginMedico');
    }

    try {
        const [turnosConfirmados] = await db.query(
            'SELECT t.*, p.nombreCompleto AS paciente, s.nombre AS sucursal FROM turnos t ' +
            'JOIN sucursal s ON t.idSucursal = s.idSucursal ' +
            'JOIN pacientes p ON t.idPaciente = p.idPaciente ' +
            'WHERE t.idMedico = ? AND t.estado = "reservado"',
            [req.session.idMedico]
        );

        // Formateamos la fecha con moment.js
        const formattedTurnos = turnosConfirmados.map(turno => {
            return {
                ...turno,
                fecha: moment(turno.fecha).format('dddd, D [de] MMMM [de] YYYY')
            };
        });

        res.render('turnosConfirmados', { turnos: formattedTurnos });
    } catch (error) {
        next(error);
    }
});



module.exports = router;