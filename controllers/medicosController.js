// controllers/medicosController.js
const db = require('../config/db');
const Medico = require('../models/Medico');
const Paciente = require('../models/Paciente');
const bcrypt = require('bcrypt');

exports.getAllMedicos = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT 
                m.idMedico,
                m.nombre,
                m.telefono,
                m.email,
                m.ciudad,
                m.dniMedico,
                GROUP_CONCAT(DISTINCT s.nombre SEPARATOR ', ') AS nombresSucursales,
                GROUP_CONCAT(DISTINCT CONCAT(e.idEspecialidad, ':', e.nombreEspecialidad, ':', me.idSucursal) SEPARATOR ', ') AS especialidades,
                GROUP_CONCAT(DISTINCT me.nroMatricula SEPARATOR ', ') AS nroMatriculas,
                CASE 
                    WHEN m.activo = 1 THEN 'Activo'
                    ELSE 'Médico eliminado'
                END AS estado
            FROM 
                medicos m
            LEFT JOIN 
                medico_especialidad me ON m.idMedico = me.idMedico
            LEFT JOIN 
                especialidad e ON me.idEspecialidad = e.idEspecialidad
            LEFT JOIN
                sucursal s ON me.idSucursal = s.idSucursal
            GROUP BY 
                m.idMedico, m.nombre, m.telefono, m.email, m.ciudad, m.dniMedico, m.activo;
        `);

        res.render('medicos', { medicos: rows });
    } catch (err) {
        console.error('Error al obtener médicos:', err);
        res.status(500).send('Error al obtener médicos');
    }
};










// // Crear un nuevo médico
// exports.createMedico = async (req, res) => {
//     const { nombre, telefono, email, ciudad, dniMedico, nromatricula, especialidadMedico } = req.body;
//     const Activo = req.body.Activo ? 1 : 0;

//     try {

//         // Insertar el nuevo médico
//         const result = await db.query(
//             'INSERT INTO medicos (nombre, telefono, email, Activo, ciudad, dniMedico, nromatricula, especialidadMedico) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
//             [nombre, telefono, email, Activo, ciudad, dniMedico, nromatricula, especialidadMedico]
//         );

//         const idMedico = result.insertId;

//         res.redirect('/medicos');
//     } catch (error) {
//         console.error('Error al crear médico:', error);
//         res.status(500).json({ message: 'Error al crear médico' });
//     }
// };

exports.createMedico = async (req, res, next) => {
    const {
        nombre,
        idEspecialidad,
        telefono,
        email,
        ciudad,
        dniMedico,
        nroMatricula,
        username,
        password,
        idSucursal
    } = req.body;

    console.log(req.body);

    // Validación de campos obligatorios
    if (
        !nombre ||
        !idEspecialidad ||
        !telefono ||
        !email ||
        !ciudad ||
        !dniMedico ||
        !nroMatricula ||
        !username ||
        !password ||
        !idSucursal
    ) {
        return res.status(400).send('Error: Todos los campos son obligatorios.');
    }

    try {
        // Validación del DNI
        if (!/^\d{8}$/.test(dniMedico)) {
            return res.status(400).send('Error: El DNI debe tener exactamente 8 números.');
        }

        // Verificación de que el DNI no esté registrado
        const [dniCheck] = await db.query('SELECT * FROM medicos WHERE dniMedico = ?', [dniMedico]);
        if (dniCheck.length > 0) {
            return res.status(400).send('Error: El DNI ingresado ya está registrado.');
        }

        const [matriculaCheck] = await db.query('SELECT nroMatricula FROM medico_especialidad WHERE nroMatricula = ?', [nroMatricula]);
        if (matriculaCheck.length > 0) {
            return res.status(400).send('Error: Esa matrícula ya existe!.');
        }

        // Verificar si el nombre de usuario ya está en uso
        const [usernameCheck] = await db.query('SELECT * FROM usuarios WHERE username = ?', [username]);
        if (usernameCheck.length > 0) {
            return res.status(400).send('Error: El nombre de usuario ya está en uso.');
        }

        // Hashear la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Crear el usuario en la tabla 'usuarios'
        const resultUsuario = await db.query(
            'INSERT INTO usuarios (email, password, rol, username, Activo) VALUES (?, ?, ?, ?, ?)',
            [email, hashedPassword, 'medico', username, 1]
        );
        const usuarioId = resultUsuario[0].insertId;

        // Crear el médico en la tabla 'medicos'
        const resultMedico = await db.query(
            'INSERT INTO medicos (nombre, telefono, email, ciudad, dniMedico, Activo, idUsuario) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [nombre, telefono, email, ciudad, dniMedico, 1, usuarioId]
        );
        const medicoId = resultMedico[0].insertId;

        // Relacionar el médico con la(s) sucursal(es)
        const sucursales = Array.isArray(idSucursal) ? idSucursal : [idSucursal]; // Aceptar múltiples sucursales
        for (const sucursalId of sucursales) {
            const [existingRelation] = await db.query(
                'SELECT * FROM medicos_sucursales WHERE idMedico = ? AND idSucursal = ?',
                [medicoId, sucursalId]
            );
            if (existingRelation.length === 0) {
                await db.query(
                    'INSERT INTO medicos_sucursales (idMedico, idSucursal) VALUES (?, ?)',
                    [medicoId, sucursalId]
                );
            }
        }

        // Insertar especialidad asociada al médico
        const insertEspecialidadQuery =
            'INSERT INTO medico_especialidad (idMedico, idEspecialidad, nroMatricula, idSucursal) VALUES (?, ?, ?, ?)';
        await db.query(insertEspecialidadQuery, [medicoId, idEspecialidad, nroMatricula, idSucursal]);

        //res.status(201).send("Médico creado correctamente.");
        res.redirect('/medicos');
    } catch (error) {
        console.error('Error al crear el médico:', error);
        res.status(500).send('Error al crear el médico.');
    }
};















// Mostrar el formulario para editar un médico
/*exports.mostrarFormularioEditarMedico = async (req, res) => {
    const idMedico = req.params.id;
    try {
        const [medico] = await db.query('SELECT * FROM medicos WHERE idMedico = ?', [idMedico]);
        if (medico.length > 0) {
            res.render('editarMedico', { medico: medico[0] });
        } else {
            res.status(404).json({ message: 'Médico no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener los datos del médico' });
    }
};*/

// Editar un médico existente
/*exports.editarMedico = async (req, res) => {
    const idMedico = req.params.id;
    const { nombre, telefono, email, ciudad, dniMedico, nroMatricula } = req.body;
 
    try {
        // Actualizar los datos del médico en la tabla 'medicos'
        const [resultMedico] = await db.query(
            'UPDATE medicos SET nombre = ?, telefono = ?, email = ?, ciudad = ?, dniMedico = ? WHERE idMedico = ?',
            [nombre, telefono, email, ciudad, dniMedico, idMedico]
        );
 
        if (resultMedico.affectedRows === 0) {
            return res.status(404).send('Médico no encontrado');
        }
 
        // Actualizar el número de matrícula en la tabla 'medico_especialidad'
        const [resultMatricula] = await db.query(
            'UPDATE medico_especialidad SET nroMatricula = ? WHERE idMedico = ?',
            [nroMatricula, idMedico]
        );
 
        if (resultMatricula.affectedRows === 0) {
            return res.status(404).send('Especialidad del médico no encontrada');
        }
 
        req.flash('success', 'Datos del médico y número de matrícula actualizados correctamente');
        res.redirect(`/medicos`);
    } catch (error) {
        console.error('Error al actualizar los datos del médico:', error);
        res.status(500).json({ message: 'Error al actualizar los datos del médico' });
    }
};*/

/*exports.mostrarFormularioEditarMedico = async (req, res, next) => {
    const idMedico = req.params.id;

    try {
        // Obtener los datos del médico por idMedico
        const [medicoData] = await db.query('SELECT * FROM medicos WHERE idMedico = ?', [idMedico]);
        const medico = medicoData[0];

        // Obtener las especialidades
        const [especialidades] = await db.query('SELECT * FROM especialidad');

        // Obtener las sucursales
        const [medSucursales] = await db.query('SELECT * FROM medicos_sucursales');
        //console.log(medSucursales);
        const [medicoEspe] = await db.query('SELECT * FROM medico_especialidad');

        const [sucursal] = await db.query('SELECT * FROM sucursal');
        //console.log(sucursal);
        if (!medico) {
            return res.status(404).send('Médico no encontrado');
        }

        // Renderizar la vista y pasarle los datos
        res.render('editarMedico', {
            medico,
            especialidades,
            medSucursales,
            medicoEspe,
            sucursales: sucursal
        });
    } catch (error) {
        console.error('Error al cargar el formulario de edición:', error);
        next(error);
    }
};*/

exports.mostrarFormularioEditarMedico = async (req, res) => {
    const { id } = req.params;

    try {
        // Obtener los datos del médico
        const [[medico]] = await db.query(
            `SELECT * FROM medicos WHERE idMedico = ?`,
            [id]
        );

        if (!medico) {
            return res.status(404).send('Médico no encontrado');
        }

        // Obtener las especialidades asignadas al médico
        const [especialidadesAsignadas] = await db.query(
            `SELECT me.idEspecialidad, me.nroMatricula, me.idSucursal, e.nombreEspecialidad AS nombreEspecialidad
                FROM medico_especialidad me
                LEFT JOIN especialidad e ON me.idEspecialidad = e.idEspecialidad
                WHERE me.idMedico = ?`,
            [id]
        );

        // Obtener todas las especialidades disponibles
        const [todasEspecialidades] = await db.query(
            `SELECT idEspecialidad, nombreEspecialidad AS nombreEspecialidad FROM especialidad`
        );

        res.render('editarMedico', { medico, especialidadesAsignadas, todasEspecialidades });
    } catch (error) {
        console.error('Error al cargar el formulario de edición:', error);
        res.status(500).send('Error al cargar el formulario de edición');
    }
};


exports.editarMedico = async (req, res) => {
    const idMedico = req.params.id;
    const { nombre, telefono, email, ciudad, dniMedico } = req.body;

    try {

        // Validación del DNI
        if (!/^\d{8}$/.test(dniMedico)) {
            return res.status(400).send('Error: El DNI debe tener exactamente 8 números.');
        }

        // Verificación de que el DNI no esté registrado
        const [dniCheck] = await db.query('SELECT * FROM medicos WHERE dniMedico = ?', [dniMedico]);
        if (dniCheck.length > 0) {
            return res.status(400).send('Error: El DNI ingresado ya está registrado.');
        }
        // Actualizar los datos del médico
        const [medicoResult] = await db.query(
            'UPDATE medicos SET nombre = ?, telefono = ?, email = ?, ciudad = ?, dniMedico = ? WHERE idMedico = ?',
            [nombre, telefono, email, ciudad, dniMedico, idMedico]
        );

        if (medicoResult.affectedRows === 0) {
            return res.status(404).send('Médico no encontrado');
        }

        req.flash('success', 'Datos del médico actualizados correctamente');
        res.redirect('/medicos');
    } catch (error) {
        console.error('Error al actualizar el médico:', error);
        res.status(500).json({ message: 'Error al actualizar los datos del médico' });
    }
};











// Borrado lógico de un médico (actualiza la columna 'Activo' en medicos y usuarios)
exports.borrarMedico = async (req, res) => {
    const idMedico = req.params.id;

    try {
        // Actualizar la columna 'Activo' en la tabla 'medicos'
        const [medicoResult] = await db.query('UPDATE medicos SET Activo = 0 WHERE idMedico = ?', [idMedico]);

        if (medicoResult.affectedRows === 0) {
            return res.status(404).send('Médico no encontrado en la base de datos');
        }

        // Actualizar la columna 'Activo' en la tabla 'usuarios' utilizando 'idUsuario' de la tabla medicos
        const [usuariosResult] = await db.query('UPDATE usuarios SET Activo = 0 WHERE id = (SELECT idUsuario FROM medicos WHERE idMedico = ?)', [idMedico]);

        if (usuariosResult.affectedRows === 0) {
            console.log(`No se encontró el idUsuario correspondiente al médico con idMedico ${idMedico} en la tabla usuarios`);
        }

        // Redirigir a la lista de médicos después de realizar el borrado lógico
        res.redirect('/medicos');
    } catch (error) {
        console.error('Error al borrar médico:', error);
        res.status(500).json({ message: 'Error al eliminar médico' });
    }
};

//Activar Médico
exports.activarMedico = async (req, res) => {
    const idMedico = req.params.idMedico;
    console.log("Medico:", idMedico);
    try {
        // Actualizar la columna 'Activo' en la tabla 'medicos'
        const [medicoResult] = await db.query('UPDATE medicos SET Activo = 1 WHERE idMedico = ?', [idMedico]);

        if (medicoResult.affectedRows === 0) {
            return res.status(404).send('Médico no encontrado en la base de datos');
        }

        // Actualizar la columna 'Activo' en la tabla 'usuarios' utilizando 'idUsuario' de la tabla medicos
        const [usuariosResult] = await db.query('UPDATE usuarios SET Activo = 1 WHERE id = (SELECT idUsuario FROM medicos WHERE idMedico = ?)', [idMedico]);

        if (usuariosResult.affectedRows === 0) {
            console.log(`No se encontró el idUsuario correspondiente al médico con idMedico ${idMedico} en la tabla usuarios`);
        }

        // Redirigir a la lista de médicos después de realizar el borrado lógico
        res.redirect('/medicos');
    } catch (error) {
        console.error('Error al borrar médico:', error);
        res.status(500).json({ message: 'Error al eliminar médico' });
    }
};



exports.eliminarEspecialidad = async (req, res) => {
    const { idMedico, idEspecialidad, idSucursal } = req.params;

    try {
        await db.query(`
            DELETE FROM medico_especialidad
            WHERE idMedico = ? AND idEspecialidad = ?`,
            [idMedico, idEspecialidad]
        );

        await db.query(`
                DELETE FROM medicos_sucursales
                WHERE idMedico = ? AND idSucursal = ?`,
            [idMedico, idSucursal]
        );

        res.redirect('/medicos');
    } catch (error) {
        console.error('Error al eliminar especialidad:', error);
        res.status(500).send('Error al eliminar la especialidad');
    }
};




exports.mostrarFormularioAsignarEspecialidad = async (req, res) => {
    const { idMedico } = req.params;

    try {
        const [medico] = await db.query(`SELECT * FROM medicos WHERE idMedico = ? AND Activo = 1`, [idMedico]);
        const [especialidades] = await db.query(`SELECT * FROM especialidad`);

        if (!medico.length) {
            return res.status(404).send('Médico no encontrado');
        }

        res.render('asignarEspecialidad', {
            medico: medico[0],
            especialidades,
        });
    } catch (error) {
        console.error('Error al cargar el formulario:', error);
        res.status(500).send('Error interno del servidor');
    }
};


exports.asignarEspecialidad = async (req, res) => {
    const { idMedico, idEspecialidad, idSucursal, nroMatricula } = req.body;

    try {
        // Validar si la especialidad ya está asignada
        const [exists] = await db.query(
            `SELECT * FROM medico_especialidad WHERE idMedico = ? AND idEspecialidad = ?`,
            [idMedico, idEspecialidad]
        );

        if (exists.length) {
            return res.status(400).send('La especialidad ya está asignada a este médico.');
        }

        const [matriculaCheck] = await db.query('SELECT nroMatricula FROM medico_especialidad WHERE nroMatricula = ?', [nroMatricula]);
        if (matriculaCheck.length > 0) {
            return res.status(400).send('Error: Esa matrícula ya existe!.');
        }

        // Asignar la especialidad al médico
        await db.query(
            `INSERT INTO medico_especialidad (idMedico, idEspecialidad, idSucursal, nroMatricula)
                VALUES (?, ?, ?, ?)`,
            [idMedico, idEspecialidad, idSucursal, nroMatricula]
        );

        const [results] = await db.query('SELECT * FROM medicos_sucursales WHERE idMedico = ? AND idSucursal = ?', [idMedico, idSucursal]);
        if (!results.length > 0) {
            await db.query(
                `INSERT INTO medicos_sucursales (idMedico, idSucursal)
                    VALUES (?, ?)`,
                [idMedico, idSucursal]
            );
        }

        res.redirect('/medicos');
    } catch (error) {
        console.error('Error al asignar especialidad:', error);
        res.status(500).send('Error al asignar la especialidad');
    }
};











// Obtener lista de médicos activos
exports.obtenerMedicos = async (req, res) => {
    try {
        const [medicos] = await db.query('SELECT * FROM medicos WHERE Activo = 1');
        res.render('medicos', { medicos });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener médicos' });
    }
};

/*exports.listarMedicosSanLuis = async (req, res) => {
    try {
        const [medicosParticulares] = await db.query('SELECT * FROM medicos WHERE sucursal = "San Luis"');
        const [medicosPorEspecialidad] = await db.query('SELECT * FROM medicos WHERE sucursal = "San Luis"');
        const [pacientes] = await db.query('SELECT * FROM pacientes WHERE Activo = 1'); // Obtener solo pacientes activos
 
        res.render('medicosSanLuis', {
            clasificacionParticular: medicosParticulares,
            clasificacionPorEspecialidad: medicosPorEspecialidad,
            pacientes
        });
    } catch (error) {
        console.error("Error al obtener médicos:", error);
        res.status(500).send("Error al obtener médicos");
    }
};*/

exports.mostrarMedicosSanLuis = async (req, res) => {
    try {
        const todosMedicos = await Medico.getMedicosConEspecialidadesPorSucursal('San Luis');
        //console.log('Sucursal buscada:', nombreSucursal);

        // Filtrar en dos categorías
        const clasificacionParticular = todosMedicos.filter(medico => !medico.especialidades);
        const clasificacionPorEspecialidad = todosMedicos.filter(medico => medico.especialidades);

        // Obtener pacientes activos
        const pacientes = await Paciente.getPacientes();

        res.render('medicosSanLuis', {
            clasificacionParticular,
            clasificacionPorEspecialidad,
            pacientes
        });
    } catch (error) {
        console.error('Error al obtener médicos de San Luis:', error);
        res.status(500).send('Error al obtener médicos');
    }
};

exports.mostrarMedicosSanLuisPac = async (req, res) => {
    try {
        // Obtener médicos de la sucursal "San Luis"
        const todosMedicos = await Medico.getMedicosConEspecialidadesPorSucursal('San Luis');

        // Filtrar en dos categorías
        const clasificacionParticular = todosMedicos.filter(medico => !medico.especialidades); // Sin especialidad
        const clasificacionPorEspecialidad = todosMedicos.filter(medico => medico.especialidades); // Con especialidad

        // Obtener pacientes activos
        const pacientes = await Paciente.getPacientes();

        res.render('medicosSanLuisDesdePac', {
            clasificacionParticular,
            clasificacionPorEspecialidad,
            pacientes
        });
    } catch (error) {
        console.error('Error al obtener médicos de San Luis:', error);
        res.status(500).send('Error al obtener médicos');
    }
};
exports.mostrarMedicosVM = async (req, res) => {
    try {
        const todosMedicos = await Medico.getMedicosConEspecialidadesPorSucursal('Villa Mercedes');

        // Filtrar en dos categorías
        const clasificacionParticular = todosMedicos.filter(medico => !medico.especialidades);
        const clasificacionPorEspecialidad = todosMedicos.filter(medico => medico.especialidades);

        // Obtener pacientes activos
        const pacientes = await Paciente.getPacientes();

        res.render('medicosVillaMercedes', {
            clasificacionParticular,
            clasificacionPorEspecialidad,
            pacientes
        });
    } catch (error) {
        console.error('Error al obtener médicos de Villa Mercedes:', error);
        res.status(500).send('Error al obtener médicos');
    }
};

exports.mostrarMedicosVMPac = async (req, res) => {
    try {
        const todosMedicos = await Medico.getMedicosConEspecialidadesPorSucursal('Villa Mercedes');

        // Filtrar en dos categorías
        const clasificacionParticular = todosMedicos.filter(medico => !medico.especialidades);
        const clasificacionPorEspecialidad = todosMedicos.filter(medico => medico.especialidades);

        // Obtener pacientes activos
        const pacientes = await Paciente.getPacientes();

        res.render('medicosVillaMercedesPac', {
            clasificacionParticular,
            clasificacionPorEspecialidad,
            pacientes
        });
    } catch (error) {
        console.error('Error al obtener médicos de Villa Mercedes:', error);
        res.status(500).send('Error al obtener médicos');
    }
};