// routes/medicos.js
const express = require('express');
const router = express.Router();
const medicosController = require('../controllers/medicosController');
const { isAuthenticated } = require('../middlewares/auth');
const db = require('../config/db');


// Obtener todos los médicos
router.get('/', medicosController.getAllMedicos);

// Mostrar formulario para dar de alta un médico
router.get('/new', async (req, res, next) => {
    try {
        // Obtener las especialidades de la base de datos
        const [especialidades] = await db.query('SELECT * FROM especialidad');

        // Renderizar la vista pasando las especialidades
        res.render('nuevoMedico', { especialidades });
    } catch (error) {
        // Manejo de errores
        next(error);
    }
});

// Crear un nuevo médico
router.post('/', medicosController.createMedico);

// Mostrar el formulario para editar un médico
router.get('/editar/:id', medicosController.mostrarFormularioEditarMedico);
/*router.get('/editar/:id', async (req, res) => {
    res.render('editarMedico');
});*/

// Ruta para actualizar un médico
router.post('/editar/:id', medicosController.editarMedico);

router.post('/eliminar/:id', medicosController.borrarMedico);

router.post('/eliminar-especialidad/:idMedico/:idEspecialidad/:idSucursal', medicosController.eliminarEspecialidad);

// Ruta para mostrar el formulario de asignación
router.get('/asignar-especialidad/:idMedico', medicosController.mostrarFormularioAsignarEspecialidad);

// Ruta para procesar la asignación
router.post('/asignar-especialidad', medicosController.asignarEspecialidad);

router.post('/activar/:idMedico', medicosController.activarMedico);






// Ruta para mostrar los médicos de San Luis
router.get('/medicosDesdePac', medicosController.mostrarMedicosSanLuis);

router.get('/medicosDesdePacSL', medicosController.mostrarMedicosSanLuisPac);

router.get('/medicosVillaMercedes', medicosController.mostrarMedicosVM);

router.get('/medicosVillaMercedesPac', medicosController.mostrarMedicosVMPac);

// Ruta para la vista medicosSanLuis
/*router.get('/medicosSanLuis', (req, res) => {
    res.render('medicosSanLuis');
});*/

module.exports = router;
