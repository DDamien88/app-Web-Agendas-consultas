// routes/dashboard.js
const express = require('express');
const { formatDate } = require('../utilidades/utils');
const router = express.Router();
const Paciente = require('../models/Paciente');


// Controlador para el dashboard
/*router.get('/', (req, res) => {
    res.render('dashboard', { title: 'Dashboard', user: req.user });
});*/

// Controlador para el dashboard
router.get('/', async (req, res) => {
    try {
        // Suponiendo que tienes el id de usuario en req.user.id
        const paciente = await Paciente.obtenerPacientePorIdUsuario(req.user.id);

        if (!paciente) {
            return res.render('dashboard', { title: 'Dashboard', user: req.user, turnos: [] });
        }

        const turnos = await Paciente.obtenerTurnosDelPaciente(paciente.idPaciente);
        console.log(turnos);

        // Formatear cada fecha dentro del objeto turno
        turnos.forEach(turno => {
            turno.fecha = formatDate(turno.fecha);
        });

        //const fechasFormateadas = turnos.map(turno => formatDate(turno.fecha)); 
        res.render('dashboard', { title: 'Dashboard', user: req.user, turnos });
    } catch (error) {
        console.error('Error al obtener los turnos:', error);
        res.render('dashboard', { title: 'Dashboard', user: req.user, turnos: [] });
    }
});






module.exports = router;
