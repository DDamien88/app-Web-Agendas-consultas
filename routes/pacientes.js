// routes/pacientes.js
const express = require('express');
const router = express.Router();
const pacientesController = require('../controllers/pacientesController');
const multer = require('multer');
const db = require('../config/db');
const upload = require('../middlewares/uploadMiddleware');

// Rutas para pacientes
router.get('/', pacientesController.obtenerPacientes);
router.get('/crear', pacientesController.mostrarFormularioCrearPaciente);
router.post('/crear', pacientesController.crearPaciente);
router.get('/editar/:idPaciente', pacientesController.mostrarFormularioEditarPaciente);
//router.post('/editar/:idPaciente', pacientesController.editarPaciente);

router.post('/editar/:idPaciente', upload.single('documentoFotocopia'), pacientesController.editarPaciente);

router.post('/eliminar/:idPaciente', pacientesController.eliminarPaciente);

router.post('/activar/:idPaciente', pacientesController.activarPaciente);




router.get('/asignar/:idTurno', pacientesController.mostrarFormularioAsignarPaciente);

// Configuración de multer para subida de archivos
// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, 'uploads/');  // Asegúrate de que esta carpeta exista
//     },
//     filename: (req, file, cb) => {
//         cb(null, `${Date.now()}-${file.originalname}`);
//     }
// });
// const upload = multer({ storage });
// upload.single('documentoFotocopia');


// Ruta para mostrar el formulario de registro
router.get('/registro', pacientesController.mostrarFormularioRegistro);

router.get('/registroDesdeAdmision', pacientesController.mostrarFormularioRegistroDesdeAdmision);
router.post('/registroDesdeAdmision', pacientesController.registrarPacienteDesdeAdmision);

//router.get('/RegistroPacIndex', pacientesController.mostrarFormularioRegistroPac);
//router.get('/registerPac', pacientesController.mostrarFormularioCrearusuario);

// Ruta para procesar el registro
router.post('/registro', upload.single('documentoFotocopia'), pacientesController.registrarPaciente);

//router.post('/registroPac', upload.single('documentoFotocopia'), pacientesController.registrarPacientePac);

router.post('/registroDesdePac', upload.single('documentoFotocopia'), pacientesController.registrarPacienteComoTal);

// Ruta para mostrar los detalles de un paciente
router.get('/detalles/:idPaciente', pacientesController.mostrarDetallesPaciente);

router.get('/pacientes/buscar', async (req, res) => {
    const { nombre } = req.query;
    try {
        const [pacientes] = await pool.query('SELECT idPaciente, nombre FROM pacientes WHERE nombre LIKE ?', [`%${nombre}%`]);
        res.json({ pacientes });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al buscar pacientes' });
    }
});

router.get('/listaEspera', pacientesController.mostrarListaEspera);

// Ruta para mostrar el formulario de lista de espera
router.get('/lista-espera/registro', pacientesController.mostrarFormularioListaEspera);

// Ruta para registrar al paciente en la lista de espera
router.post('/lista-espera', pacientesController.registrarEnListaEspera);

// Ruta API para sucursales
router.get('/medicos/:idMedico/especialidades/:idEspecialidad/sucursales', async (req, res) => {
    const { idMedico, idEspecialidad } = req.params;

    const [sucursales] = await db.query(
        `SELECT DISTINCT s.idSucursal, s.nombre AS nombreSucursal
        FROM medico_especialidad me
        JOIN sucursal s ON me.idSucursal = s.idSucursal 
        WHERE me.idMedico = ? AND me.idEspecialidad = ?`,
        [idMedico, idEspecialidad]
    );

    res.json(sucursales);

});


router.get('/medicos/:idMedico/especialidades', pacientesController.obtenerEspecialidadesPorMedico);
router.get('/buscar', pacientesController.buscarPacientes);


router.post('/actualizarEstadoListaEspera', pacientesController.actualizarEstadoListaEspera);



// Ruta para asignar un turno
//router.post('/turno/asignar', pacientesController.asignarPaciente);

module.exports = router;
