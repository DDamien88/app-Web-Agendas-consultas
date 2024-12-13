// controllers/pacientesController.js
const Paciente = require('../models/Paciente');
const db = require('../config/db');
const multer = require('multer');
const path = require('path');
const { validationResult } = require('express-validator');
const fs = require('fs');
const bcrypt = require('bcryptjs');
//const upload = require('../middlewares/uploadMiddleware');


exports.mostrarFormularioRegistro = (req, res) => {
    res.render('registroPaciente');
};

exports.mostrarFormularioRegistroDesdeAdmision = (req, res) => {
    res.render('registroPacDesdeAdmision');
};

/*exports.mostrarFormularioRegistroPac = (req, res) => {
    res.render('RegistroPacIndex');
};
*/
/*exports.mostrarFormularioCrearusuario = (req, res) => {
    res.render('/registerPac');
};
*/

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Asegúrate de que la carpeta uploads esté correctamente definida
        cb(null, 'uploads'); // Almacena los archivos directamente en 'uploads'
    },
    filename: (req, file, cb) => {
        // Genera un nombre único para el archivo
        cb(null, Date.now() + path.extname(file.originalname)); // Ejemplo: 1631773645111.jpg
    }
});

// Usar el middleware de Multer
const upload = multer({ storage: storage });

// Ruta para registrar un paciente




exports.registrarPaciente = async (req, res) => {
    try {
        const { nombreCompleto, dni, motivoConsulta, obraSocial, datosContacto } = req.body;
        const documentoFotocopia = req.file ? req.file.filename : null;

        // Verificar si el DNI ya existe
        const existePaciente = await Paciente.obtenerPorDNI(dni);
        if (existePaciente) {
            return res.render('registroPaciente', { error: 'El DNI ya está registrado.' });
        }

        const nuevoPaciente = {
            nombreCompleto,
            dni,
            motivoConsulta,
            obraSocial,
            datosContacto,
            documentoFotocopia,
            Activo: 1
        };

        await Paciente.crearPaciente(nuevoPaciente);
        res.redirect('/pacientes');
    } catch (error) {
        console.error("Error al registrar paciente:", error);
        res.status(500).send("Error al registrar paciente");
    }
};

// Ruta para registrar un paciente
exports.registrarPacienteDesdeAdmision = async (req, res) => {
    try {
        const { nombreCompleto, dni, motivoConsulta, obraSocial, datosContacto } = req.body;
        const documentoFotocopia = req.file ? req.file.filename : null;

        // Verificar si el DNI ya existe
        const existePaciente = await Paciente.obtenerPorDNI(dni);
        if (existePaciente) {
            return res.render('registroPacDesdeAdmision', { error: 'El DNI ya está registrado.' });
        }

        const nuevoPaciente = {
            nombreCompleto,
            dni,
            motivoConsulta,
            obraSocial,
            datosContacto,
            documentoFotocopia,
            Activo: 1
        };

        await Paciente.crearPaciente(nuevoPaciente);
        res.redirect('/auth/registerPac');
    } catch (error) {
        console.error("Error al registrar paciente:", error);
        res.status(500).send("Error al registrar paciente");
    }
};

exports.registrarPacientePac = async (req, res) => {
    try {
        const { nombreCompleto, dni, motivoConsulta, obraSocial, datosContacto } = req.body;
        const documentoFotocopia = req.file ? req.file.filename : null;

        // Verificar si el DNI ya existe
        const existePaciente = await Paciente.obtenerPorDNI(dni);
        if (existePaciente) {
            return res.render('login', { error: 'El DNI ya está registrado.' });
        }

        const nuevoPaciente = {
            nombreCompleto,
            dni,
            motivoConsulta,
            obraSocial,
            datosContacto,
            documentoFotocopia,
            Activo: 1
        };

        await Paciente.crearPaciente(nuevoPaciente);
        res.redirect('login');
    } catch (error) {
        console.error("Error al registrar paciente:", error);
        res.status(500).send("Error al registrar paciente");
    }
};

// Mostrar el formulario para crear un nuevo paciente
exports.mostrarFormularioCrearPaciente = async (req, res) => {
    try {
        res.render('crearPaciente'); // Asegúrate de que la vista 'crearPaciente.pug' exista
    } catch (error) {
        res.status(500).json({ message: 'Error al mostrar el formulario para crear paciente' });
    }
};

exports.registrarPacienteComoTal = async (req, res) => {
    try {
        const { nombreCompleto, dni, motivoConsulta, obraSocial, datosContacto } = req.body;
        const documentoFotocopia = req.file ? req.file.filename : null;

        // Verificar si el DNI ya existe
        const existePaciente = await Paciente.obtenerPorDNI(dni);
        if (existePaciente) {
            return res.render('RegistroPacIndex', { error: 'El DNI ya está registrado.' });
        }

        const nuevoPaciente = {
            nombreCompleto,
            dni,
            motivoConsulta,
            obraSocial,
            datosContacto,
            documentoFotocopia,
            Activo: 1
        };

        await Paciente.crearPaciente(nuevoPaciente);
        res.redirect('/registerPac');
    } catch (error) {
        console.error("Error al registrar paciente:", error);
        res.status(500).send("Error al registrar paciente");
    }
};




// Crear un nuevo paciente
exports.crearPaciente = async (req, res) => {
    try {
        await Paciente.crearPaciente(req.body);
        res.redirect('/pacientes');
    } catch (error) {
        res.status(500).json({ message: 'Error al crear paciente' });
    }
};

// Obtener la lista de pacientes
exports.obtenerPacientes = async (req, res) => {
    try {
        const [pacientes] = await db.query('SELECT * FROM pacientes');
        res.render('pacientes', { pacientes }); // Asegúrate de que la vista 'pacientes.pug' exista
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener pacientes' });
    }
};

// Mostrar formulario de edición de paciente - Versión que funciona
// exports.mostrarFormularioEditarPaciente = async (req, res) => {
//     const { idPaciente } = req.params;

//     try {
//         const paciente = await Paciente.obtenerPacientePorId(idPaciente);
//         res.render('editarPaciente', { paciente });
//     } catch (error) {
//         res.status(500).json({ message: 'Error al obtener paciente' });
//     }
// };


exports.mostrarFormularioEditarPaciente = async (req, res) => {
    const { idPaciente } = req.params;

    try {
        const [paciente] = await db.query(
            `SELECT idPaciente, nombreCompleto, dni, motivoConsulta, obraSocial, datosContacto, documentoFotocopia
            FROM pacientes
            WHERE idPaciente = ?`,
            [idPaciente]
        );

        if (!paciente.length) {
            return res.status(404).render('404', { error: 'Paciente no encontrado' });
        }

        res.render('editarPaciente', {
            paciente: paciente[0],
            success_msg: req.flash('success_msg'),
            error_msg: req.flash('error_msg'),
        });
    } catch (error) {
        console.error('Error al obtener datos del paciente:', error);
        res.status(500).render('500', { error: 'Error interno del servidor' });
    }
};

// Actualizar paciente - Versión que funciona
// exports.editarPaciente = async (req, res) => {
//     const { idPaciente } = req.params;
//     const { dni } = req.body;

//     // Validación del DNI
//     if (!/^\d{8}$/.test(dni)) {
//         return res.status(400).send('Error: El DNI debe tener exactamente 8 números.');
//     }

//     // Verificación de que el DNI no esté registrado
//     const [dniCheck] = await db.query('SELECT * FROM pacientes WHERE dni = ?', [dni]);
//     if (dniCheck.length > 0) {
//         return res.status(400).send('Error: El DNI ingresado ya está registrado.');
//     }

//     try {
//         await Paciente.actualizarPaciente(idPaciente, req.body);
//         req.flash('success', 'Paciente editado correctamente');
//         res.redirect('/pacientes');
//     } catch (error) {
//         req.flash('error', 'Error al editar paciente');
//         res.redirect(`/pacientes/editar/${idPaciente}`);
//     }
// };

exports.editarPaciente = async (req, res) => {
    console.log('req.body:', req.body);
    console.log('req.file:', req.file);

    const { idPaciente } = req.params;
    const { nombreCompleto, dni, motivoConsulta, obraSocial, datosContacto } = req.body;
    const documentoFotocopia = req.file ? req.file.filename : null;

    if (!nombreCompleto || !dni || !obraSocial || !datosContacto) {
        req.flash('error_msg', 'Error: Todos los campos son obligatorios.');
        return res.redirect(`/pacientes/editar/${idPaciente}`);
    }

    if (!/^\d{8}$/.test(dni)) {
        req.flash('error_msg', 'Error: El DNI debe tener exactamente 8 números.');
        return res.redirect(`/pacientes/editar/${idPaciente}`);
    }

    const [dniCheck] = await db.query('SELECT * FROM pacientes WHERE dni = ? AND idPaciente != ?', [dni, idPaciente]);
    if (dniCheck.length > 0) {
        req.flash('error_msg', 'Error: El DNI ingresado ya está registrado.');
        return res.redirect(`/pacientes/editar/${idPaciente}`);
    }

    try {
        const [paciente] = await db.query('SELECT documentoFotocopia FROM pacientes WHERE idPaciente = ?', [idPaciente]);

        console.log('Paciente encontrado:', paciente);

        if (!paciente) {
            req.flash('error_msg', 'Error: Paciente no encontrado.');
            return res.redirect(`/pacientes/editar/${idPaciente}`);
        }

        const archivoAnterior = paciente.documentoFotocopia;
        console.log('archivoAnterior:', archivoAnterior);
        console.log('documentoFotocopia (nuevo):', documentoFotocopia);

        const archivoFinal = documentoFotocopia || archivoAnterior;

        await db.query(
            `UPDATE pacientes 
            SET nombreCompleto = ?, dni = ?, motivoConsulta = ?, obraSocial = ?, datosContacto = ?, documentoFotocopia = ?
            WHERE idPaciente = ?`,
            [nombreCompleto, dni, motivoConsulta, obraSocial, datosContacto, archivoFinal, idPaciente]
        );

        if (documentoFotocopia && archivoAnterior) {
            const filePath = path.join(__dirname, '../uploads', archivoAnterior);
            fs.unlink(filePath, (err) => {
                if (err) console.error('Error al eliminar archivo anterior:', err);
            });
        }

        req.flash('success_msg', 'Paciente actualizado con éxito.');
        res.redirect(`/pacientes/editar/${idPaciente}`);
    } catch (error) {
        console.error('Error al actualizar paciente:', error);
        req.flash('error_msg', 'Error al actualizar paciente.');
        res.redirect(`/pacientes/editar/${idPaciente}`);
    }
};





// Eliminar paciente
exports.eliminarPaciente = async (req, res) => {
    const { idPaciente } = req.params;

    try {
        await Paciente.eliminarPaciente(idPaciente);
        res.redirect('/pacientes');
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar paciente' });
    }
};

//Activar Paciente
exports.activarPaciente = async (req, res) => {
    const { idPaciente } = req.params;

    try {
        await Paciente.activarPaciente(idPaciente);
        res.redirect('/pacientes');
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar paciente' });
    }
};




// Agrega esta función a pacientesController.js
exports.asignarPaciente = async (req, res) => {
    const { nombre, documento, idMedico, fecha, hora } = req.body;

    // Verifica si el paciente ya está registrado
    const paciente = await Paciente.obtenerPorDocumento(documento);

    if (!paciente) {
        // Si no está registrado, crea uno nuevo
        await Paciente.crearPaciente({ nombre, documento });
    }

    // Lógica para asignar el turno
    await db.query('INSERT INTO turnos (idMedico, idPaciente, fecha, hora) VALUES (?, ?, ?, ?)', [idMedico, paciente.idPaciente, fecha, hora]);

    res.redirect('/turnos');
};

// Asegúrate de que tu modelo Paciente tenga esta función
Paciente.obtenerPorDocumento = async (documento) => {
    const query = 'SELECT * FROM pacientes WHERE documento = ?';
    const [result] = await db.query(query, [documento]);
    return result[0]; // Retorna el primer resultado
};

// Mostrar el formulario para crear un nuevo paciente
exports.mostrarFormularioAsignarPaciente = async (req, res) => {
    const { idTurno } = req.params;

    try {
        // Obtén la lista de pacientes
        const [pacientes] = await db.query('SELECT * FROM pacientes');
        res.render('asignarPaciente', { pacientes, idTurno });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener pacientes' });
    }
};

// Mostrar los detalles de un paciente
exports.mostrarDetallesPaciente = async (req, res) => {
    const idPaciente = req.session.idPaciente;
    console.log(`Buscando paciente con ID: ${idPaciente}`);

    try {
        const paciente = await Paciente.obtenerDetallePacientePorId(req.session.idPaciente);
        console.log(`Paciente encontrado: ${JSON.stringify(paciente)}`);

        if (!paciente) {
            return res.status(404).send("Paciente no encontrado");
        }
        res.render('detallesPaciente', { paciente });
    } catch (error) {
        console.error('Error al obtener detalles del paciente:', error);
        res.status(500).json({ message: 'Error al obtener detalles del paciente' });
    }
};


exports.registrarPacienteDefnitivo = async (req, res) => {
    // Validar datos del formulario
    const { nombreCompleto, email, username, password, dni, motivoConsulta, obraSocial, datosContacto, Activo } = req.body;

    try {

        if (!/^\d{8}$/.test(dni)) {
            return res.status(400).send('Error: El DNI debe tener exactamente 8 números.');
        }

        // Validar si el correo electrónico o el nombre de usuario ya existen
        const [usuarioExistente] = await db.query('SELECT * FROM usuarios WHERE email = ? OR username = ?', [email, username]);
        if (usuarioExistente.length > 0) {
            return res.render('RegistroPacIndex', {
                messages: { error: [{ msg: 'El correo electronico o el nombre de usuario ya está en uso.' }] }
            });
        }

        // Verificar si el DNI ya está registrado
        const [dniExistente] = await db.query('SELECT * FROM pacientes WHERE dni = ?', [dni]);
        if (dniExistente.length > 0) {
            return res.render('RegistroPacIndex', {
                messages: { error: [{ msg: 'DNI ya registrado en un paciente.' }] }
            });
        }

        const [dniExistenteMedico] = await db.query('SELECT * FROM medicos WHERE dniMedico = ?', [dni]);
        if (dniExistenteMedico.length > 0) {
            return res.render('RegistroPacIndex', {
                messages: { error: [{ msg: 'DNI ya registrado en un médico.' }] }
            });
        }

        // Encriptar la contraseña
        const salt = await bcrypt.genSalt(10);
        const passwordEncriptada = await bcrypt.hash(password, salt);

        // Insertar el usuario primero, para obtener el idUsuario
        const [resultUsuario] = await db.query(
            'INSERT INTO usuarios (username, email, password, activo) VALUES (?, ?, ?, ?)',
            [username, email, passwordEncriptada, 1]
        );

        const idUsuario = resultUsuario.insertId; // Obtener el id del usuario recién insertado

        // Ahora insertar el paciente, incluyendo el idUsuario como clave foránea
        await db.query(
            'INSERT INTO pacientes (nombreCompleto, dni, motivoConsulta, obraSocial, datosContacto, idUsuario, documentoFotocopia) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [nombreCompleto, dni, motivoConsulta, obraSocial, datosContacto, idUsuario, req.file ? req.file.path : null]
        );

        req.session.messages = { success: [{ msg: '¡Paciente registrado con éxito!' }] };
        res.redirect('/auth/loginPac');
        console.log('Messages:', { success: [{ msg: '¡Paciente registrado con éxito!' }] });


    } catch (err) {
        console.error(err);
        res.render('RegistroPacIndex', {
            messages: { error: [{ msg: 'Hubo un error al registrar al paciente.' }] }
        });
    }
};

exports.mostrarFormularioListaEspera = async (req, res) => {
    try {
        const [agendas] = await db.query(
            `SELECT DISTINCT am.*, 
                e.nombreEspecialidad AS especialidad, 
                m.nombre AS nombreMedico, 
                s.nombre AS sucursal, 
                s.idSucursal
            FROM agendas_medicos am
            INNER JOIN especialidad e ON am.idEspecialidad = e.idEspecialidad
            INNER JOIN medico_especialidad me ON am.idEspecialidad = me.idEspecialidad
            INNER JOIN sucursal s ON me.idSucursal = s.idSucursal
            INNER JOIN medicos m ON am.idMedico = m.idMedico
            WHERE am.activo = 1;
`,
        );
        console.log(agendas);
        res.render('registroListaEspera', {
            agendas
        });
    } catch (error) {
        console.error('Error al mostrar formulario de lista de espera:', error);
        res.status(500).send('Error al cargar el formulario de lista de espera');
    }
};


exports.obtenerEspecialidadesPorMedico = async (req, res) => {
    const { idMedico } = req.params;

    try {
        // Consulta las especialidades asociadas al médico específico
        const [especialidades] = await db.query(
            'SELECT e.idEspecialidad, e.nombreEspecialidad FROM especialidad e ' +
            'JOIN medico_especialidad me ON e.idEspecialidad = me.idEspecialidad ' +
            'WHERE me.idMedico = ?',
            [idMedico]
        );

        if (especialidades.length === 0) {
            return res.status(404).json({ mensaje: 'No se encontraron especialidades para este médico.' });
        }

        res.json(especialidades);
    } catch (error) {
        console.error('Error al obtener especialidades del médico:', error);
        res.status(500).json({ error: 'No se pudieron cargar las especialidades.' });
    }
};

exports.buscarPacientes = async (req, res) => {
    const { query } = req.query;

    try {
        const [pacientes] = await db.query(
            'SELECT idPaciente, nombreCompleto, dni FROM pacientes ' +
            'WHERE (nombreCompleto LIKE ? OR dni LIKE ?) AND Activo = 1',
            [`%${query}%`, `%${query}%`]
        );

        res.json(pacientes);
    } catch (error) {
        console.error('Error al buscar pacientes:', error);
        res.status(500).json({ error: 'Error al buscar pacientes.' });
    }
};





exports.mostrarListaEspera = async (req, res) => {
    const { alert, type } = req.query;
    try {
        const [listaEspera] = await db.query(`
            SELECT le.*, m.nombre AS nombreMedico, e.nombreEspecialidad, p.nombreCompleto AS nombrePaciente, p.dni,
            s.nombre AS sucursal
            FROM lista_espera le  
            Left JOIN sucursal s ON s.idSucursal = le.idSucursal
            JOIN agendas_medicos am ON le.idAgenda = am.idAgenda
            JOIN especialidad e ON am.idEspecialidad = e.idEspecialidad
            JOIN medicos m ON am.idMedico = m.idMedico
            LEFT JOIN pacientes p ON le.idPaciente = p.idPaciente 
        `);

        res.render('listaEspera', {
            listaEspera,
            alert: alert || null,
            type: type || null
        });
    } catch (error) {
        console.error('Error al mostrar la lista de espera:', error);
        res.status(500).send('Error al cargar la lista de espera');
    }
};






exports.registrarEnListaEspera = async (req, res) => {
    const { idAgenda, idPaciente, motivoConsulta, idSucursal } = req.body;

    if (!idSucursal) {
        return res.status(400).render('registroListaEspera', {
            alert: { type: 'danger', message: 'Debe seleccionar una agenda válida con una sucursal.' },
            agendas: [],
        });
    }

    try {
        await db.query(
            `INSERT INTO lista_espera (idPaciente, motivoConsulta, fechaRegistro, estado, idSucursal, idAgenda) 
            VALUES (?, ?, NOW(), 'Pendiente', ?, ?)`,
            [idPaciente, motivoConsulta || 'No especificado', idSucursal, idAgenda]
        );
        res.redirect('/pacientes/listaEspera'); // Redirige a la lista de espera.
    } catch (error) {
        console.error('Error al registrar paciente en la lista de espera:', error);
        res.status(500).render('registroListaEspera', {
            alert: { type: 'danger', message: 'Error al registrar en la lista de espera.' },
            agendas: [], // Asegúrate de volver a enviar los datos necesarios.
        });
    }
};








exports.actualizarEstadoListaEspera = async (req, res) => {
    const { idListaEspera, estado } = req.body;

    try {
        const query = `
            DELETE FROM lista_espera 
                WHERE idListaEspera = ?
        `;
        await db.query(query, [idListaEspera]);

        res.redirect(`/pacientes/listaEspera`);
    } catch (error) {
        console.error('Error al actualizar el estado de la lista de espera:', error);
        res.redirect(`/pacientes/lista-espera`);
    }
};


