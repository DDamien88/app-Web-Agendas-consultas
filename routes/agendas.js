// routes/agendas.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const agendasController = require('../controllers/agendasController');

router.get('/', agendasController.mostrarAgendas);

//router.get('/editar/:idAgenda', agendasController.mostrarEditarAgenda);
//router.post('/editar/:idAgenda', agendasController.editarAgenda);

router.get('/editar/:idAgenda', agendasController.mostrarEditarHorarios );
router.post('/editar/:idAgenda', agendasController.actualizarHorarios );

router.post('/eliminar/:idAgenda', agendasController.eliminarAgenda);
router.post('/activar/:idAgenda', agendasController.activarAgenda);



router.get('/bloqueos-agenda', agendasController.listarBloqueos);
router.get('/bloqueos-agendas', agendasController.mostrarFormularioBloqueo);
router.post('/bloqueos-agenda/crear', agendasController.crearBloqueo);
router.post('/bloqueos-agenda/eliminar/:idBloqueo', agendasController.eliminarBloqueo);

// Obtener sucursales del médico
router.get('/api/medicos/:idMedico/sucursales', async (req, res) => {
    const { idMedico } = req.params;
    try {
        const [sucursales] = await db.query(`
            SELECT DISTINCT s.idSucursal, s.nombre AS nombreSucursal
            FROM medico_especialidad me
            JOIN sucursal s ON me.idSucursal = s.idSucursal
            WHERE me.idMedico = ?`, [idMedico]);

        res.json(sucursales);
    } catch (error) {
        console.error('Error al obtener sucursales:', error);
        res.status(500).json({ error: 'Error al obtener sucursales' });
    }
});

router.get('/api/sucursales/:idMedico/agendas', async (req, res) => {
    const { idMedico } = req.params;
    try {
        // Ajustar la consulta para filtrar por médico y sucursal específica
        const [agendas] = await db.query(`
            SELECT a.idAgenda, a.intervalos, a.cantSobreTurnos, m.nombre AS nombreMedico, 
                e.nombreEspecialidad, s.nombre
            FROM agendas_medicos a
            JOIN medico_especialidad me 
                ON a.idMedico = me.idMedico AND a.idEspecialidad = me.idEspecialidad
            JOIN medicos m 
                ON a.idMedico = m.idMedico
            JOIN especialidad e 
                ON a.idEspecialidad = e.idEspecialidad
            JOIN sucursal s 
                ON me.idSucursal = s.idSucursal
            WHERE a.idMedico = ?
        `, [idMedico]);

        res.json(agendas);
    } catch (error) {
        console.error('Error al obtener agendas:', error);
        res.status(500).json({ error: 'Error al obtener agendas' });
    }
});









// Ruta para mostrar el formulario
router.get('/nuevaEspecialidad', (req, res) => {
    res.render('nuevaEspecialidad');
});

router.post('/nuevaEspecialidad', async (req, res) => {
    const { nombreEspecialidad } = req.body;
    const nombreTrimmed = nombreEspecialidad.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    console.log('Nombre recibido:', nombreEspecialidad);
    console.log('Nombre procesado:', nombreTrimmed);
    try {
        const existeEspecialidad = await db.query('SELECT * FROM especialidad WHERE LOWER(nombreEspecialidad) = ?', [nombreTrimmed]);

        console.log('Resultado de la consulta:', existeEspecialidad);

        if (existeEspecialidad[0].length > 0) {
            //req.flash('error', 'Ya existe una especialidad con ese nombre.');
            res.status(400).send('Ya existe una especialidad con ese nombre.');
            console.log('Redireccionando por duplicado');
            return res.redirect('/agendas/nuevaEspecialidad');
        }
        console.log('Mensaje de error flash:', req.flash('error'));

        await db.query('INSERT INTO especialidad (nombreEspecialidad) VALUES (?)', [nombreTrimmed]);

        req.flash('success', 'Especialidad creada con éxito.');
        console.log('Especialidad creada con éxito');
        res.redirect('/agendas/especialidades');
    } catch (error) {
        console.error('Error al insertar la especialidad:', error);
        req.flash('error', 'Hubo un problema al crear la especialidad.');
        //res.status(500).send('Error al crear la especialidad. Intente nuevamente.');
    }
});






// Ruta para listar especialidades
router.get('/especialidades', async (req, res) => {
    try {
        const especialidadesRaw = await db.query('SELECT * FROM especialidad');
        const especialidades = especialidadesRaw[0];
        res.render('especialidades', {
            especialidades,
            success_msg: req.flash('success'),
            error_msg: req.flash('error')
        });
    } catch (error) {
        console.error('Error al obtener las especialidades:', error);
        res.status(500).send('Error al cargar las especialidades.');
        res.redirect('/agendas/especialidades');
    }
});





router.get('/especialidades/editar/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const [especialidad] = await db.query(
            'SELECT * FROM especialidad WHERE idEspecialidad = ?',
            [id]
        );

        if (!especialidad || especialidad.length === 0) {
            return res.status(404).send('Especialidad no encontrada');
        }

        res.render('editarEspecialidad', { especialidad: especialidad[0] });
    } catch (error) {
        console.error('Error al cargar la especialidad:', error);
        res.status(500).send('Hubo un error al cargar la especialidad');
    }
});


// Ruta para editar especialidad
router.post('/especialidades/editar/:id', async (req, res) => {
    const { id } = req.params;
    const { nombreEspecialidad } = req.body;

    try {
        // Verificar si ya existe otra especialidad con el mismo nombre
        const [existeEspecialidad] = await db.query(
            'SELECT * FROM especialidad WHERE nombreEspecialidad = ? AND idEspecialidad != ?',
            [nombreEspecialidad, id]
        );

        if (existeEspecialidad.length > 0) {
            return res.render('editarEspecialidad', {
                especialidad: { idEspecialidad: id, nombreEspecialidad },
                error_msg: 'Ya existe una especialidad con ese nombre.'
            });
        }

        // Actualizar el nombre de la especialidad
        await db.query(
            'UPDATE especialidad SET nombreEspecialidad = ? WHERE idEspecialidad = ?',
            [nombreEspecialidad, id]
        );

        // Mensaje de éxito y redirección
        req.flash('success', 'Especialidad editada correctamente');
        res.redirect('/agendas/especialidades');
    } catch (error) {
        console.error('Error al editar la especialidad:', error);
        res.render('editarEspecialidad', {
            especialidad: { idEspecialidad: id, nombreEspecialidad },
            error_msg: 'Hubo un error al editar la especialidad.'
        });
    }
});








router.post('/especialidades/eliminar/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await db.query('DELETE FROM especialidad WHERE idEspecialidad = ?', [id]);
        req.flash('success', 'Especialidad eliminada con éxito.');
        res.redirect('/agendas/especialidades');
    } catch (error) {
        console.error('Error eliminando especialidad:', error);
        res.status(500).send('Hubo un error al intentar eliminar la especialidad.');
        req.flash('error', 'Hubo un problema al eliminar la especialidad.');
        res.redirect('/agendas/especialidades');
    }
});

module.exports = router;