// controllers/horariosController.js
//const Horario = require('../models/Horario');
const Medicos = require('../models/Medico');
const Paciente = require('../models/Paciente');
const Turno = require('../models/Turno');
const db = require('../config/db');
//const { obtenerEspecialidades } = require('../models/Especialidad');
const Especialidad = require('../models/Especialidad');
const HorariosMedicos = require('../models/Horario');
const { format, addDays, addMinutes, parseISO } = require('date-fns');
const { esFeriado } = require('../config/feriados');

exports.mostrarPlanificarAgenda = async (req, res) => {
    try {
        const [medicos] = await db.query('SELECT idMedico, nombre FROM medicos WHERE activo = 1');
        const [sucursales] = await db.query('SELECT * FROM sucursal');
        const [especialidades] = await db.query('SELECT * FROM especialidad');

        res.render('planificarAgenda', { medicos, sucursales, especialidades });
    } catch (error) {
        console.error('Error al obtener datos:', error);
        res.status(500).send('Error interno del servidor');
    }
};




exports.mostrarCrearAgenda = async (req, res) => {
    try {
        const [medicos] = await db.query('SELECT idMedico, nombre FROM medicos WHERE activo = 1');
        const [sucursales] = await db.query('SELECT * FROM sucursal');
        const [especialidades] = await db.query('SELECT * FROM especialidad');

        res.render('crearAgenda', { medicos, sucursales, especialidades });
    } catch (error) {
        console.error('Error al obtener datos:', error);
        res.status(500).send('Error interno del servidor');
    }
};

const obtenerSucursales = async () => {
    const [sucursales] = await db.query('SELECT idSucursal, nombre FROM sucursal');
    return sucursales;
};


exports.crearAgenda = async (req, res) => {
    const { idSucursal, idEspecialidad, idMedico, intervalos, cantSobreTurnos } = req.body;

    try {
        // Validar que todos los campos obligatorios están completos
        if (!idSucursal || !idEspecialidad || !idMedico || !intervalos || !cantSobreTurnos) {
            return res.render('crearAgenda', {
                sucursales: await obtenerSucursales(),
                success: null,
                error: 'Por favor, completa todos los campos obligatorios.'
            });
        }

        // Inserción en la tabla `agendas_medicos`
        await db.query(
            `INSERT INTO agendas_medicos (activo, intervalos, cantSobreTurnos, idMedico, idEspecialidad) 
                VALUES (?, ?, ?, ?, ?)`,
            [1, intervalos, cantSobreTurnos, idMedico, idEspecialidad]
        );

        res.redirect('/agendas');

    } catch (error) {
        console.error('Error al crear agenda:', error);
        res.render('crearAgenda', {
            sucursales: await obtenerSucursales(),
            success: null,
            error: 'Hubo un error al crear la agenda. Por favor, intenta nuevamente.'
        });
    }
};


exports.obtenerEspecialidadesPorSucursal = async (req, res) => {
    const { sucursal } = req.query;

    if (!sucursal) {
        return res.status(400).json({ error: 'Sucursal no especificada' });
    }

    try {
        const [especialidades] = await db.query(`
            SELECT DISTINCT e.idEspecialidad, e.nombreEspecialidad
            FROM medico_especialidad me
            INNER JOIN especialidad e ON me.idEspecialidad = e.idEspecialidad
            WHERE me.idSucursal = ?
        `, [sucursal]);

        if (especialidades.length === 0) {
            return res.status(404).json({ error: 'No se encontraron especialidades para esta sucursal.' });
        }

        res.json(especialidades);
    } catch (error) {
        console.error('Error al obtener especialidades:', error);
        res.status(500).json({ error: 'Error al obtener especialidades' });
    }
};

exports.obtenerMedicosPorSucursalYEspecialidad = async (req, res) => {
    const { sucursal, especialidad } = req.query;

    if (!sucursal || !especialidad) {
        return res.status(400).json({ error: 'Sucursal o especialidad no especificada' });
    }

    try {
        const [medicos] = await db.query(`
            SELECT m.idMedico, m.nombre
            FROM medico_especialidad me
            INNER JOIN medicos m ON me.idMedico = m.idMedico
            WHERE me.idSucursal = ? AND me.idEspecialidad = ?
        `, [sucursal, especialidad]);

        res.json(medicos);
    } catch (error) {
        console.error('Error al obtener médicos:', error);
        res.status(500).json({ error: 'Error al obtener médicos' });
    }
};





exports.mostrarCrearHorarios = async (req, res) => {
    try {
        // Recuperar las agendas activas junto con la información del médico y especialidad
        const [agendas] = await db.query(`SELECT 
                am.*, 
                e.nombreEspecialidad, 
                m.nombre AS nombreMedico, 
                s.nombre AS sucursal, 
                s.idSucursal
            FROM agendas_medicos am
            INNER JOIN especialidad e ON am.idEspecialidad = e.idEspecialidad
            INNER JOIN medico_especialidad me ON am.idMedico = me.idMedico AND am.idEspecialidad = me.idEspecialidad
            INNER JOIN sucursal s ON me.idSucursal = s.idSucursal
            INNER JOIN medicos m ON am.idMedico = m.idMedico
            WHERE am.activo = 1`);

        res.render('planificarAgendaDos', { agendas });
    } catch (error) {
        console.error('Error al obtener agendas:', error);
        res.status(500).send('Error interno del servidor');
    }
};

exports.planificarHorarios = async (req, res) => {
    const { agenda, fecha, dias } = req.body;

    if (!agenda || !fecha || !dias) {
        return res.status(400).json({ error: "Todos los campos son obligatorios." });
    }

    const horarios = Array.from({ length: 7 }).map((_, i) => ({
        horaInicioManana: req.body[`horarios[${i}][horaInicioManana]`] || null,
        horaFinManana: req.body[`horarios[${i}][horaFinManana]`] || null,
        horaInicioTarde: req.body[`horarios[${i}][horaInicioTarde]`] || null,
        horaFinTarde: req.body[`horarios[${i}][horaFinTarde]`] || null,
    }));

    try {
        // Buscar la agenda seleccionada
        const [agendaData] = await db.query(
            `SELECT idAgenda, idMedico, idEspecialidad, cantSobreTurnos FROM agendas_medicos WHERE idAgenda = ?`,
            [agenda]
        );

        if (!agendaData || agendaData.length === 0) {
            return res.status(400).json({ error: "La agenda seleccionada no es válida." });
        }

        // Verificar si ya existen horarios para la agenda seleccionada
        const [horas] = await db.query(
            `SELECT * FROM horarios_de_agendas WHERE agenda = ?`,
            [agenda]
        );

        if (horas.length > 0)
            return res.status(400).json({
                error: "YA EXISTEN TURNOS PARA ÉSTA AGENDA. PUEDE IR A EDITARLA"
            });



        const { idMedico, idEspecialidad, cantSobreTurnos } = agendaData[0];

        const fechaInicio = parseISO(fecha);
        const horariosFinales = [];

        const generarIntervalos = (fecha, horaInicio, horaFin, duracion, cantSobreTurnos) => {
            if (!horaInicio || !horaFin) return [];
            const intervalos = [];
            let inicio = parseISO(`${fecha}T${horaInicio}:00`);
            const fin = parseISO(`${fecha}T${horaFin}:00`);

            while (inicio < fin) {
                const horaFinIntervalo = addMinutes(inicio, duracion);
                if (horaFinIntervalo <= fin) {
                    intervalos.push({
                        fecha,
                        horaInicio: format(inicio, "HH:mm"),
                        horaFin: format(horaFinIntervalo, "HH:mm"),
                        estado: 'libre',
                        bloqueado: 0,
                        agenda: agenda,
                        esSobreTurno: 0,
                    });

                    // Sobreturnos
                    for (let i = 0; i < cantSobreTurnos; i++) {
                        intervalos.push({
                            fecha,
                            horaInicio: format(inicio, "HH:mm"),
                            horaFin: format(horaFinIntervalo, "HH:mm"),
                            estado: 'libre',
                            bloqueado: 0,
                            agenda: agenda,
                            esSobreTurno: 1,
                        });
                    }
                }
                inicio = horaFinIntervalo;
            }
            return intervalos;
        };

        // Generar los intervalos de horarios para cada día
        for (let dia = 0; dia < dias; dia++) {
            const fechaActual = format(addDays(fechaInicio, dia), "yyyy-MM-dd");

            // Verificar si la fecha es un feriado
            if (esFeriado(fechaActual)) {
                console.log(`Se omite la fecha ${fechaActual} por ser feriado.`);
                continue;  // Si es feriado, no generamos horarios para este día
            }

            const diaSemana = (fechaInicio.getDay() + dia) % 7;
            const diaFormulario = (diaSemana + 6) % 7;

            const { horaInicioManana, horaFinManana, horaInicioTarde, horaFinTarde } = horarios[diaFormulario];

            if (horaInicioManana && horaFinManana) {
                horariosFinales.push(
                    ...generarIntervalos(fechaActual, horaInicioManana, horaFinManana, 30, cantSobreTurnos) // Usando 30 minutos por defecto
                );
            }
            if (horaInicioTarde && horaFinTarde) {
                horariosFinales.push(
                    ...generarIntervalos(fechaActual, horaInicioTarde, horaFinTarde, 30, cantSobreTurnos) // Usando 30 minutos por defecto
                );
            }
        }

        // Insertar los horarios generados en la base de datos
        if (horariosFinales.length > 0) {
            const sql = `INSERT INTO horarios_de_agendas (fecha, horaInicio, horaFin, estado, bloqueado, agenda, esSobreTurno) VALUES ?`;
            const values = horariosFinales.map((h) => [
                h.fecha,
                h.horaInicio,
                h.horaFin,
                h.estado,
                h.bloqueado,
                h.agenda,
                h.esSobreTurno,
            ]);
            await db.query(sql, [values]);
        }

        res.redirect('/agendas');
    } catch (error) {
        console.error("Error al generar horarios:", error);
        return res.status(500).json({ error: "Error interno del servidor." });
    }
};









// Controlador para agregar los horarios planificados  -Versión 1
/*exports.agregarHorarioPlanificado = async (req, res) => {
    //const { idSucursal, idEspecialidad, idMedico, diaSemana, horaInicio, horaFin, duracion } = req.body;
    const {
        idSucursal, idEspecialidad, idMedico, diaSemana,
        horaInicioManana, horaFinManana,
        horaInicioTarde, horaFinTarde,
        duracion
    } = req.body;
 
    if (!horaInicioManana && !horaInicioTarde) {
        return res.status(400).json({ error: "Debe proporcionar al menos un horario (mañana o tarde)." });
    }
 
    try {
        // Verificar que todos los campos necesarios estén presentes
        if (!idSucursal || !idEspecialidad || !idMedico || !diaSemana || !duracion) {
            return res.status(400).json({ error: "Todos los campos son obligatorios." });
        }
 
        const cantSobreTurnos = 3; // Cantidad fija de sobreturnos
        const estado = 1; // Estado activo
        const horarios = [];
 
        // Asegurarse de que diaSemana sea un arreglo
        const dias = Array.isArray(diaSemana) ? diaSemana.map(Number) : [Number(diaSemana)];
 
        // Insertar o actualizar la agenda del médico en agendas_medicos
        const [resultAgenda] = await db.query(`
            INSERT INTO agendas_medicos (intervalos, cantSobreTurnos, activo, idMedico, idEspecialidad)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
                intervalos = VALUES(intervalos),
                cantSobreTurnos = VALUES(cantSobreTurnos),
                activo = VALUES(activo)
        `, [duracion, cantSobreTurnos, 1, idMedico, idEspecialidad]);
 
        // Obtener el idAgenda (debe ser el ID generado o actualizado)
        const idAgenda = resultAgenda.insertId || (await db.query(`
            SELECT idAgenda FROM agendas_medicos 
            WHERE idMedico = ? AND idEspecialidad = ? 
        `, [idMedico, idEspecialidad]))[0]?.idAgenda;
 
        if (!idAgenda) {
            return res.status(400).json({ error: "Error al obtener o generar la agenda." });
        }
 
        // Función para calcular la hora de fin y formatearla en HH:mm
        function calcularHoraFin(horaInicio, duracion) {
            const [horas, minutos] = horaInicio.split(":").map(Number);
            const totalMinutos = horas * 60 + minutos + Number(duracion);
            const nuevaHora = Math.floor(totalMinutos / 60);
            const nuevosMinutos = totalMinutos % 60;
            return `${nuevaHora.toString().padStart(2, '0')}:${nuevosMinutos.toString().padStart(2, '0')}`;
        }
 
        // Crear los horarios para cada día de la semana en los próximos 30 días
        for (let i = 0; i < 30; i++) {
            const fecha = new Date();
            fecha.setDate(fecha.getDate() + i);
            const fechaStr = fecha.toISOString().split('T')[0];
 
            dias.forEach(dia => {
                if (fecha.getDay() === dia) {
                    // Generar horarios de mañana
                    if (horaInicioManana && horaFinManana) {
                        let hora = horaInicioManana;
                        while (hora < horaFinManana) {
                            const horaFinIntervalo = calcularHoraFin(hora, duracion);
                            if (horaFinIntervalo > horaFinManana) break;
                            horarios.push([fechaStr, hora, horaFinIntervalo, estado, false, idAgenda]);
                            hora = horaFinIntervalo;
                        }
                    }
 
                    // Generar horarios de tarde
                    if (horaInicioTarde && horaFinTarde) {
                        let hora = horaInicioTarde;
                        while (hora < horaFinTarde) {
                            const horaFinIntervalo = calcularHoraFin(hora, duracion);
                            if (horaFinIntervalo > horaFinTarde) break;
                            horarios.push([fechaStr, hora, horaFinIntervalo, estado, false, idAgenda]);
                            hora = horaFinIntervalo;
                        }
                    }
                }
            });
        }
 
        // Insertar horarios en la base de datos
        if (horarios.length > 0) {
            await db.query(`
                INSERT INTO horarios_de_agendas (fecha, horaInicio, horaFin, estado, bloqueado, agenda)
                VALUES ?
            `, [horarios]);
 
            return res.status(200).json({ message: "Horarios planificados correctamente y agenda médica actualizada." });
        } else {
            return res.status(400).json({ error: "No se pudieron generar horarios para la agenda." });
        }
 
    } catch (error) {
        console.error('Error al planificar horarios:', error);
        return res.status(500).json({ error: "Error al planificar horarios." });
    }
};*/









//versión 2
// exports.agregarHorarioPlanificado = async (req, res) => {
//     const { idEspecialidad, idMedico, duracion, fecha } = req.body;

//     const horarios = [];
//     for (let i = 0; i < 7; i++) {
//         horarios.push({
//             horaInicioManana: req.body[`horarios[${i}][horaInicioManana]`] || null,
//             horaFinManana: req.body[`horarios[${i}][horaFinManana]`] || null,
//             horaInicioTarde: req.body[`horarios[${i}][horaInicioTarde]`] || null,
//             horaFinTarde: req.body[`horarios[${i}][horaFinTarde]`] || null,
//         });
//     }

//     if (!idEspecialidad || !idMedico || !duracion || !fecha) {
//         return res.status(400).json({ error: "Todos los campos son obligatorios." });
//     }

//     try {
//         const estado = 1; // Estado activo
//         const cantSobreTurnos = 3; // Sobreturnos por defecto
//         const horariosFinales = [];

//         // Paso 1: Crear o actualizar la agenda
//         const [resultAgenda] = await db.query(
//             `
//             INSERT INTO agendas_medicos (idEspecialidad, idMedico, intervalos, cantSobreTurnos, activo)
//             VALUES (?, ?, ?, ?, ?)
//             ON DUPLICATE KEY UPDATE 
//                 intervalos = VALUES(intervalos),
//                 cantSobreTurnos = VALUES(cantSobreTurnos),
//                 activo = VALUES(activo)
//             `,
//             [idEspecialidad, idMedico, duracion, cantSobreTurnos, estado]
//         );

//         const idAgenda = resultAgenda.insertId || (
//             await db.query(
//                 `SELECT idAgenda FROM agendas_medicos WHERE idEspecialidad = ? AND idMedico = ?`,
//                 [idEspecialidad, idMedico]
//             )
//         )[0]?.idAgenda;

//         if (!idAgenda) {
//             return res.status(400).json({ error: "No se pudo crear o encontrar la agenda." });
//         }

//         // Función para generar intervalos
//         const generarIntervalos = (horaInicio, horaFin, fecha, duracion) => {
//             const intervalos = [];
//             let inicio = parseISO(`${fecha}T${horaInicio}:00`);
//             const fin = parseISO(`${fecha}T${horaFin}:00`);

//             while (inicio < fin) {
//                 const horaFinIntervalo = addMinutes(inicio, duracion);

//                 if (horaFinIntervalo <= fin) {
//                     intervalos.push({
//                         fecha,
//                         horaInicio: format(inicio, 'HH:mm'),
//                         horaFin: format(horaFinIntervalo, 'HH:mm'),
//                         estado: 1,
//                         bloqueado: 0,
//                         agenda: idAgenda
//                     });
//                 }

//                 inicio = horaFinIntervalo;
//             }
//             return intervalos;
//         };

//         // Paso 2: Generar horarios para máximo 30 días
//         for (const [idx, diaHorarios] of horarios.entries()) {
//             if (diaHorarios) {
//                 const { horaInicioManana, horaFinManana, horaInicioTarde, horaFinTarde } = diaHorarios;

//                 if (!horaInicioManana && !horaInicioTarde) continue; // Saltar si no hay horarios definidos

//                 // Calcular la fecha correspondiente
//                 const fechaInicio = parseISO(fecha);
//                 const diaSemana = (idx - fechaInicio.getDay() + 7) % 7;
//                 fechaInicio.setDate(fechaInicio.getDate() + diaSemana);

//                 // Generar horarios para los próximos 30 días a partir de fechaInicio
//                 const fechaFin = addDays(fechaInicio, 29); // Último día del rango
//                 for (let fechaTurno = fechaInicio; fechaTurno <= fechaFin; fechaTurno = addDays(fechaTurno, 1)) {
//                     const fechaTurnoStr = format(fechaTurno, 'yyyy-MM-dd');

//                     // Generar horarios para los próximos 30 días
//                     // for (let i = 0; i < 30; i++) {
//                     //     const fechaTurno = addDays(fechaInicio, i * 7);
//                     //     const fechaTurnoStr = format(fechaTurno, 'yyyy-MM-dd');
//                     if (diaHorarios.horaInicioManana || diaHorarios.horaInicioTarde) { // Asegurarse de acceder a las propiedades correctas
//                         console.log("Hay horarios definidos para el día:", fechaTurnoStr); // Agregar un log para verificar
//                         if (horaInicioManana && horaFinManana) {
//                             horariosFinales.push(
//                                 ...generarIntervalos(horaInicioManana, horaFinManana, fechaTurnoStr, parseInt(duracion))
//                             );
//                         }
//                         if (horaInicioTarde && horaFinTarde) {
//                             horariosFinales.push(
//                                 ...generarIntervalos(horaInicioTarde, horaFinTarde, fechaTurnoStr, parseInt(duracion))
//                             );
//                         }
//                     }
//                 }
//             }
//         }

//         // Paso 3: Guardar horarios en horarios_de_agendas
//         await db.query(
//             `INSERT INTO horarios_de_agendas (fecha, horaInicio, horaFin, estado, bloqueado, agenda) VALUES ?`,
//             [
//                 horariosFinales.map(h => [
//                     h.fecha,
//                     h.horaInicio,
//                     h.horaFin,
//                     h.estado,
//                     h.bloqueado,
//                     h.agenda,
//                 ]),
//             ]
//         );

//         return res.status(200).json({ message: "Horarios generados correctamente.", horarios: horariosFinales });
//     } catch (error) {
//         console.error("Error al generar horarios:", error);
//         return res.status(500).json({ error: "Error interno del servidor." });
//     }
// };





// Versión 3 - LA MEJOR
// exports.agregarHorarioPlanificado = async (req, res) => {
//     const { idEspecialidad, idMedico, duracion, fecha, cantSobreTurnos } = req.body;

//     // Validar campos obligatorios
//     if (!idEspecialidad || !idMedico || !duracion || !fecha || !cantSobreTurnos) {
//         return res.status(400).json({ error: "Todos los campos son obligatorios." });
//     }

//     // Obtener los horarios enviados para los 7 días
//     const horarios = Array.from({ length: 7 }).map((_, i) => ({
//         horaInicioManana: req.body[`horarios[${i}][horaInicioManana]`] || null,
//         horaFinManana: req.body[`horarios[${i}][horaFinManana]`] || null,
//         horaInicioTarde: req.body[`horarios[${i}][horaInicioTarde]`] || null,
//         horaFinTarde: req.body[`horarios[${i}][horaFinTarde]`] || null,
//     }));

//     try {
//         const estado = 1;
//         //const cantSobreTurnos = 3;

//         const[checkMedicoYEspecialidad] = await db.query(
//             `
//             SELECT idAgenda FROM agendas_medicos WHERE idEspecialidad = ? AND idMedico = ?
//             `,
//             [idEspecialidad, idMedico]
//         )
//         if (checkMedicoYEspecialidad.length > 0) {
//             return res.status(400).json({ error: "Ya existe una agenda para este medico y especialidad." });
//         }

//         // **PASO 1: Crear o encontrar la agenda médica**
//         const [resultAgenda] = await db.query(
//             `
//       INSERT INTO agendas_medicos (idEspecialidad, idMedico, intervalos, cantSobreTurnos, activo)
//       VALUES (?, ?, ?, ?, ?)
//       ON DUPLICATE KEY UPDATE 
//         intervalos = VALUES(intervalos),
//         cantSobreTurnos = VALUES(cantSobreTurnos),
//         activo = VALUES(activo)
//       `,
//             [idEspecialidad, idMedico, duracion, cantSobreTurnos, estado]
//         );

//         const idAgenda = resultAgenda.insertId || (
//             await db.query(
//                 `SELECT idAgenda FROM agendas_medicos WHERE idEspecialidad = ? AND idMedico = ?`,
//                 [idEspecialidad, idMedico]
//             )
//         )[0]?.idAgenda;

//         if (!idAgenda) {
//             return res.status(400).json({ error: "No se pudo crear o encontrar la agenda." });
//         }

//         // **PASO 2: Generar horarios**
//         const fechaInicio = parseISO(fecha); // Fecha de inicio de la planificación
//         const fechaFin = addDays(fechaInicio, 29); // Rango de 30 días
//         const horariosFinales = [];

//         // Generador de intervalos
//         const generarIntervalos = (fecha, horaInicio, horaFin, duracion) => {
//             if (!horaInicio || !horaFin) return [];
//             const intervalos = [];
//             let inicio = parseISO(`${fecha}T${horaInicio}:00`);
//             const fin = parseISO(`${fecha}T${horaFin}:00`);

//             while (inicio < fin) {
//                 const horaFinIntervalo = addMinutes(inicio, duracion);
//                 if (horaFinIntervalo <= fin) {
//                     intervalos.push({
//                         fecha,
//                         horaInicio: format(inicio, "HH:mm"),
//                         horaFin: format(horaFinIntervalo, "HH:mm"),
//                         estado: 1,
//                         bloqueado: 0,
//                         agenda: idAgenda,
//                     });
//                 }
//                 inicio = horaFinIntervalo;
//             }
//             return intervalos;
//         };

//         // Generar horarios para cada día dentro de los 30 días
//         for (let dia = 0; dia < 30; dia++) {
//             const fechaActual = format(addDays(fechaInicio, dia), "yyyy-MM-dd");
//             const diaSemana = (fechaInicio.getDay() + dia) % 7;
//             const diaFormulario = (diaSemana + 6) % 7; // Transformar domingo como último día

//             const { horaInicioManana, horaFinManana, horaInicioTarde, horaFinTarde } =
//                 horarios[diaFormulario];

//             // Generar horarios mañana y tarde
//             if (horaInicioManana && horaFinManana) {
//                 horariosFinales.push(
//                     ...generarIntervalos(fechaActual, horaInicioManana, horaFinManana, parseInt(duracion))
//                 );
//             }
//             if (horaInicioTarde && horaFinTarde) {
//                 horariosFinales.push(
//                     ...generarIntervalos(fechaActual, horaInicioTarde, horaFinTarde, parseInt(duracion))
//                 );
//             }
//         }

//         // **PASO 3: Insertar horarios en la base de datos**
//         if (horariosFinales.length > 0) {
//             const sql = `INSERT INTO horarios_de_agendas (fecha, horaInicio, horaFin, estado, bloqueado, agenda) VALUES ?`;
//             const values = horariosFinales.map((h) => [
//                 h.fecha,
//                 h.horaInicio,
//                 h.horaFin,
//                 h.estado,
//                 h.bloqueado,
//                 h.agenda,
//             ]);
//             await db.query(sql, [values]);
//         }

//         return res.status(200).json({ message: "Horarios generados correctamente.", horarios: horariosFinales });
//     } catch (error) {
//         console.error("Error al generar horarios:", error);
//         return res.status(500).json({ error: "Error interno del servidor." });
//     }
// };


//Versión 4 - LA MEJOR de la mejor
// exports.agregarHorarioPlanificado = async (req, res) => {
//     const { idEspecialidad, idMedico, duracion, fecha, cantSobreTurnos, dias } = req.body;

//     if (!idEspecialidad || !idMedico || !duracion || !dias || !fecha || cantSobreTurnos === undefined) {
//         return res.status(400).json({ error: "Todos los campos son obligatorios." });
//     }

//     const horarios = Array.from({ length: 7 }).map((_, i) => ({
//         horaInicioManana: req.body[`horarios[${i}][horaInicioManana]`] || null,
//         horaFinManana: req.body[`horarios[${i}][horaFinManana]`] || null,
//         horaInicioTarde: req.body[`horarios[${i}][horaInicioTarde]`] || null,
//         horaFinTarde: req.body[`horarios[${i}][horaFinTarde]`] || null,
//     }));

//     try {
//         const estado = 1;

//         const [checkMedicoYEspecialidad] = await db.query(
//             `SELECT idAgenda FROM agendas_medicos WHERE idEspecialidad = ? AND idMedico = ?`,
//             [idEspecialidad, idMedico]
//         );
//         if (checkMedicoYEspecialidad.length > 0) {
//             return res.status(400).json({ error: "Ya existe una agenda para este médico y especialidad." });
//         }

//         const [resultAgenda] = await db.query(
//             `INSERT INTO agendas_medicos (idEspecialidad, idMedico, intervalos, cantSobreTurnos, activo)
//             VALUES (?, ?, ?, ?, ?)
//             ON DUPLICATE KEY UPDATE 
//                 intervalos = VALUES(intervalos),
//                 cantSobreTurnos = VALUES(cantSobreTurnos),
//                 activo = VALUES(activo)`,
//             [idEspecialidad, idMedico, duracion, cantSobreTurnos, estado]
//         );

//         const idAgenda = resultAgenda.insertId || (
//             await db.query(
//                 `SELECT idAgenda FROM agendas_medicos WHERE idEspecialidad = ? AND idMedico = ?`,
//                 [idEspecialidad, idMedico]
//             )
//         )[0]?.idAgenda;

//         if (!idAgenda) {
//             return res.status(400).json({ error: "No se pudo crear o encontrar la agenda." });
//         }

//         const fechaInicio = parseISO(fecha);
//         const fechaFin = addDays(fechaInicio, 29);
//         const horariosFinales = [];

//         const generarIntervalos = (fecha, horaInicio, horaFin, duracion, cantSobreTurnos) => {
//             if (!horaInicio || !horaFin) return [];
//             const intervalos = [];
//             let inicio = parseISO(`${fecha}T${horaInicio}:00`);
//             const fin = parseISO(`${fecha}T${horaFin}:00`);

//             while (inicio < fin) {
//                 const horaFinIntervalo = addMinutes(inicio, duracion);
//                 if (horaFinIntervalo <= fin) {
//                     const turno = {
//                         fecha,
//                         horaInicio: format(inicio, "HH:mm"),
//                         horaFin: format(horaFinIntervalo, "HH:mm"),
//                         estado: 1,
//                         bloqueado: 0,
//                         agenda: idAgenda,
//                     };
//                     intervalos.push(turno);

//                     // Generar sobreturnos
//                     for (let i = 0; i < cantSobreTurnos; i++) {
//                         intervalos.push({
//                             ...turno,
//                             esSobreTurno: true,
//                         });
//                     }
//                 }
//                 inicio = horaFinIntervalo;
//             }
//             return intervalos;
//         };

//         for (let dia = 0; dia < dias; dia++) {
//             const fechaActual = format(addDays(fechaInicio, dia), "yyyy-MM-dd");
//             const diaSemana = (fechaInicio.getDay() + dia) % 7;
//             const diaFormulario = (diaSemana + 6) % 7;

//             const { horaInicioManana, horaFinManana, horaInicioTarde, horaFinTarde } = horarios[diaFormulario];

//             if (horaInicioManana && horaFinManana) {
//                 horariosFinales.push(
//                     ...generarIntervalos(fechaActual, horaInicioManana, horaFinManana, parseInt(duracion), cantSobreTurnos)
//                 );
//             }
//             if (horaInicioTarde && horaFinTarde) {
//                 horariosFinales.push(
//                     ...generarIntervalos(fechaActual, horaInicioTarde, horaFinTarde, parseInt(duracion), cantSobreTurnos)
//                 );
//             }
//         }

//         if (horariosFinales.length > 0) {
//             const sql = `INSERT INTO horarios_de_agendas (fecha, horaInicio, horaFin, estado, bloqueado, agenda, esSobreTurno) VALUES ?`;
//             const values = horariosFinales.map((h) => [
//                 h.fecha,
//                 h.horaInicio,
//                 h.horaFin,
//                 'libre',
//                 h.bloqueado,
//                 h.agenda,
//                 h.esSobreTurno || 0,
//             ]);
//             await db.query(sql, [values]);
//         }

//         //return res.status(200).json({ message: "Horarios y sobreturnos generados correctamente.", horarios: horariosFinales });
//         res.redirect('/agendas');
//     } catch (error) {
//         console.error("Error al generar horarios:", error);
//         return res.status(500).json({ error: "Error interno del servidor." });
//     }
// };



//Versión última funcionando!!!
// exports.agregarHorarioPlanificado = async (req, res) => {
//     const { idEspecialidad, idMedico, duracion, fecha, cantSobreTurnos, dias } = req.body;

//     if (!idEspecialidad || !idMedico || !duracion || !dias || !fecha || cantSobreTurnos === undefined) {
//         return res.status(400).json({ error: "Todos los campos son obligatorios." });
//     }

//     const horarios = Array.from({ length: 7 }).map((_, i) => ({
//         horaInicioManana: req.body[`horarios[${i}][horaInicioManana]`] || null,
//         horaFinManana: req.body[`horarios[${i}][horaFinManana]`] || null,
//         horaInicioTarde: req.body[`horarios[${i}][horaInicioTarde]`] || null,
//         horaFinTarde: req.body[`horarios[${i}][horaFinTarde]`] || null,
//     }));

//     try {
//         const estado = 1;

//         const [checkMedicoYEspecialidad] = await db.query(
//             `SELECT idAgenda FROM agendas_medicos WHERE idEspecialidad = ? AND idMedico = ?`,
//             [idEspecialidad, idMedico]
//         );
//         if (checkMedicoYEspecialidad.length > 0) {
//             return res.status(400).json({ error: "Ya existe una agenda para este médico y especialidad." });
//         }

//         const [resultAgenda] = await db.query(
//             `INSERT INTO agendas_medicos (idEspecialidad, idMedico, intervalos, cantSobreTurnos, activo)
//             VALUES (?, ?, ?, ?, ?)
//             ON DUPLICATE KEY UPDATE 
//                 intervalos = VALUES(intervalos),
//                 cantSobreTurnos = VALUES(cantSobreTurnos),
//                 activo = VALUES(activo)`,
//             [idEspecialidad, idMedico, duracion, cantSobreTurnos, estado]
//         );

//         const idAgenda = resultAgenda.insertId || (
//             await db.query(
//                 `SELECT idAgenda FROM agendas_medicos WHERE idEspecialidad = ? AND idMedico = ?`,
//                 [idEspecialidad, idMedico]
//             )
//         )[0]?.idAgenda;

//         if (!idAgenda) {
//             return res.status(400).json({ error: "No se pudo crear o encontrar la agenda." });
//         }

//         const fechaInicio = parseISO(fecha);
//         const fechaFin = addDays(fechaInicio, 29);
//         const horariosFinales = [];

//         const generarIntervalos = (fecha, horaInicio, horaFin, duracion, cantSobreTurnos) => {
//             if (!horaInicio || !horaFin) return [];
//             const intervalos = [];
//             let inicio = parseISO(`${fecha}T${horaInicio}:00`);
//             const fin = parseISO(`${fecha}T${horaFin}:00`);

//             while (inicio < fin) {
//                 const horaFinIntervalo = addMinutes(inicio, duracion);
//                 if (horaFinIntervalo <= fin) {
//                     const turno = {
//                         fecha,
//                         horaInicio: format(inicio, "HH:mm"),
//                         horaFin: format(horaFinIntervalo, "HH:mm"),
//                         estado: 1,
//                         bloqueado: 0,
//                         agenda: idAgenda,
//                     };
//                     intervalos.push(turno);

//                     // Generar sobreturnos
//                     for (let i = 0; i < cantSobreTurnos; i++) {
//                         intervalos.push({
//                             ...turno,
//                             esSobreTurno: true,
//                         });
//                     }
//                 }
//                 inicio = horaFinIntervalo;
//             }
//             return intervalos;
//         };

//         for (let dia = 0; dia < dias; dia++) {
//             const fechaActual = format(addDays(fechaInicio, dia), "yyyy-MM-dd");
//             const diaSemana = (fechaInicio.getDay() + dia) % 7;
//             const diaFormulario = (diaSemana + 6) % 7;

//             // Verificar si la fecha es un feriado
//             if (esFeriado(fechaActual)) {
//                 console.log(`Se omite la fecha ${fechaActual} por ser feriado.`);
//                 continue;
//             }

//             const { horaInicioManana, horaFinManana, horaInicioTarde, horaFinTarde } = horarios[diaFormulario];

//             if (horaInicioManana && horaFinManana) {
//                 horariosFinales.push(
//                     ...generarIntervalos(fechaActual, horaInicioManana, horaFinManana, parseInt(duracion), cantSobreTurnos)
//                 );
//             }
//             if (horaInicioTarde && horaFinTarde) {
//                 horariosFinales.push(
//                     ...generarIntervalos(fechaActual, horaInicioTarde, horaFinTarde, parseInt(duracion), cantSobreTurnos)
//                 );
//             }
//         }

//         if (horariosFinales.length > 0) {
//             const sql = `INSERT INTO horarios_de_agendas (fecha, horaInicio, horaFin, estado, bloqueado, agenda, esSobreTurno) VALUES ?`;
//             const values = horariosFinales.map((h) => [
//                 h.fecha,
//                 h.horaInicio,
//                 h.horaFin,
//                 'libre',
//                 h.bloqueado,
//                 h.agenda,
//                 h.esSobreTurno || 0,
//             ]);
//             await db.query(sql, [values]);
//         }

//         res.redirect('/agendas');
//     } catch (error) {
//         console.error("Error al generar horarios:", error);
//         return res.status(500).json({ error: "Error interno del servidor." });
//     }
// };




// Sobre Turnos
exports.obtenerSobreturnos = async (req, res) => {
    try {
        const { especialidad, medico, mes, año } = req.query;

        // Validar parámetros requeridos
        if (!especialidad || !medico || !mes || !año) {
            return res.status(400).json({ error: 'Faltan parámetros requeridos' });
        }

        // Consultar sobre turnos desde la tabla horarios_de_agendas
        const query = `
            SELECT idHorario, fecha, horaInicio, horaFin, estado, bloqueado, esSobreTurno
            FROM horarios_de_agendas
            WHERE 
                esSobreTurno = 1 
                AND estado = 'libre' 
                AND bloqueado = 0 
                AND agenda IN (
                    SELECT idAgenda 
                    FROM agendas_medicos
                    WHERE idEspecialidad = ? AND idMedico = ?
                )
                AND YEAR(fecha) = ? 
                AND MONTH(fecha) = ?
                AND fecha >= CURDATE()
            ORDER BY fecha, horaInicio;
        `;

        // Ejecutar la consulta con los parámetros correctos
        const sobreturnos = await db.query(query, [especialidad, medico, año, mes]);

        if (sobreturnos.length === 0) {
            res.status(404).json({ error: 'No se encontraron sobre turnos disponibles' });
        }

        const cleanSobreturnos = JSON.parse(JSON.stringify(sobreturnos));

        res.json({ sobreturnos: cleanSobreturnos });
    } catch (error) {
        console.error('Error al obtener sobre turnos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};



























exports.mostrarHorariosDisponibles = async (req, res) => {
    const { idMedico, año, mes } = req.query;  // Los parámetros vienen en la URL (query string)

    console.log(`idMedico: ${idMedico}, Año: ${año}, Mes: ${mes}`);  // Log para depurar

    try {
        const [horariosDisponibles] = await db.query(`
                    SELECT h.fecha, h.horaInicio, h.horaFin, DAYOFWEEK(h.fecha) AS diaSemana
        FROM horarios_agendas h
        WHERE h.idMedico = ?

        `, [idMedico, año, mes]);

        console.log(`Horarios Disponibles: ${JSON.stringify(horariosDisponibles)}`); // Ver los resultados

        if (horariosDisponibles.length === 0) {
            return res.status(404).send('No hay horarios disponibles para este médico en este mes.');
        }

        const eventos = horariosDisponibles.map(horario => ({
            title: `Horario: ${horario.fecha}`,
            start: `${new Date(horario.fecha).toISOString().split('T')[0]}T${horario.horaInicio.split(' - ')[0]}:00`,
            end: `${new Date(horario.fecha).toISOString().split('T')[0]}T${horario.horaFin.split(' - ')[1]}:00`,
            description: 'Turno disponible'
        }));

        res.render('horariosDisponibles', {
            medicos: await Medicos.getAll(),
            horariosDisponibles: eventos,
            año,
            mes,
            idMedico
        });

    } catch (error) {
        console.error('Error al obtener los horarios:', error);
        res.status(500).send('Error interno del servidor');
    }
};








/*exports.agregarHorarioPlanificado = async (req, res) => {
    const { idMedico, idSucursal, diaSemana, horaInicio, horaFin, activo } = req.body;
 
    try {
        // Validaciones básicas
        if (!idMedico || !idSucursal || !diaSemana || !horaInicio || !horaFin) {
            return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios.' });
        }
        console.log(diaSemana);
        // Guardar los horarios en la tabla de la base de datos
        for (const dia of diaSemana) {
            await db.query(
                'INSERT INTO agendas_medicos (idMedico, idSucursal, diaSemana, horaInicio, horaFin, activo) VALUES (?, ?, ?, ?, ?, ?)',
                [idMedico, idSucursal, dia, horaInicio, horaFin, 1]
            );
        }
 
        res.json({ success: true, message: 'Horarios planificados correctamente.' });
    } catch (error) {
        console.error('Error al planificar horarios:', error);
        res.status(500).json({ success: false, message: 'Error al planificar horarios.' });
    }
}*/

/*async function generarHorariosDesdeAgenda(idAgenda, duracion) {
    try {
        // Obtener la agenda médica específica
        const [agenda] = await db.query(`
            SELECT idAgenda, idMedico, diaSemana, horaInicio, horaFin, idSucursal, idEspecialidad
            FROM agendas_medicos
            WHERE idAgenda = ? AND activo = 1
        `, [idAgenda]);
 
        if (!agenda || agenda.length === 0) {
            console.log('No se encontró una agenda activa con ese ID.');
            return;
        }
 
        const { idMedico, diaSemana, horaInicio, horaFin, idSucursal, idEspecialidad } = agenda[0];
 
        // Definir un rango de fechas (ejemplo: próximos 30 días)
        const fechaInicio = new Date();
        const fechaFin = new Date();
        fechaFin.setDate(fechaInicio.getDate() + 30);
 
        // Generar las fechas para los días correspondientes al `diaSemana`
        const fechas = [];
        for (let dia = new Date(fechaInicio); dia <= fechaFin; dia.setDate(dia.getDate() + 1)) {
            if (dia.getDay() + 1 === diaSemana) { // getDay: 0 (domingo) a 6 (sábado), ajustado a 1-7
                fechas.push(new Date(dia));
            }
        }
 
        // Generar horarios por cada fecha
        const horarios = [];
        fechas.forEach(fecha => {
            const [horaInicioHoras, horaInicioMinutos] = horaInicio.split(':').map(Number);
            const [horaFinHoras, horaFinMinutos] = horaFin.split(':').map(Number);
 
            let inicio = new Date(fecha);
            inicio.setHours(horaInicioHoras, horaInicioMinutos);
 
            const fin = new Date(fecha);
            fin.setHours(horaFinHoras, horaFinMinutos);
 
            while (inicio < fin) {
                const siguiente = new Date(inicio);
                siguiente.setMinutes(siguiente.getMinutes() + duracion);
 
                if (siguiente <= fin) {
                    horarios.push({
                        idMedico,
                        idSucursal,
                        fecha: new Date(inicio),
                        horaInicio: inicio.toTimeString().slice(0, 5), // HH:mm
                        horaFin: siguiente.toTimeString().slice(0, 5), // HH:mm
                        estado: 'Libre',
                        bloqueado: false,
                        duracion
                    });
                }
                inicio = siguiente;
            }
        });
 
        // Insertar horarios en la tabla `horarios_agendas`
        if (horarios.length > 0) {
            const valores = horarios.map(h => [
                h.idMedico,
                h.idSucursal,
                h.fecha,
                h.horaInicio,
                h.horaFin,
                h.estado,
                h.bloqueado,
                h.duracion
            ]);
 
            await db.query(`
                INSERT INTO horarios_agendas (idMedico, idSucursal, fecha, horaInicio, horaFin, estado, bloqueado, duracion)
                VALUES ?
            `, [valores]);
 
            console.log(`${horarios.length} horarios generados correctamente para la agenda ${idAgenda}.`);
        } else {
            console.log('No se generaron horarios para la agenda seleccionada.');
        }
    } catch (error) {
        console.error('Error al generar horarios:', error);
    }
}
 
// Ejecutar función con un ID de agenda y una duración
generarHorariosDesdeAgenda(1, 30);*/




function obtenerDiaSemana(fecha) {
    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return diasSemana[fecha.getDay()];
}
// Obtener los horarios de un médico en un rango de fechas
exports.obtenerHorarios = async (req, res) => {
    const idMedico = req.params.idMedico;
    try {
        const query = `
            SELECT ha.*, m.nombre AS nombreMedico 
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

// Insertar nuevos horarios en la tabla horarios_turnos
exports.insertarHorariosTurnos = async (req, res) => {
    const { idMedico, diaSemana, horaInicio, horaFin, estado } = req.body;

    // Validar idMedico
    if (!idMedico) {
        return res.status(400).send("El idMedico no puede estar vacío.");
    }

    // Asegurarse de que el idMedico es un número
    const idMedicoInt = parseInt(idMedico, 10);
    if (isNaN(idMedicoInt)) {
        return res.status(400).send("El idMedico debe ser un número válido.");
    }

    try {
        // Verificar si el médico existe
        const [medico] = await db.query('SELECT * FROM medicos WHERE idMedico = ?', [idMedicoInt]);

        if (medico.length === 0) {
            return res.status(404).send("El médico no existe.");
        }

        // Insertar en horarios_agendas
        const query = `INSERT INTO horarios_agendas (idMedico, diaSemana, horaInicio, horaFin, estado) VALUES (?, ?, ?, ?, ?)`;
        await db.query(query, [idMedicoInt, diaSemana, horaInicio, horaFin, estado]);

        res.send('Horarios insertados exitosamente.');
    } catch (error) {
        console.error('Error al insertar horarios:', error);
        res.status(500).send('Error al insertar horarios.');
    }
};


// Bloquear horario por imprevistos o ausencias
exports.bloquearHorario = async (req, res) => {
    const { idHorario } = req.params;
    const { idMedico } = req.body;

    try {
        // Actualizar el estado del horario a "Bloqueado"
        await db.query('UPDATE horarios_agendas SET estado = ?, bloqueado = 1, fechaBloqueo = NOW() WHERE idHorario = ?', ['Bloqueado', idHorario]);
        console.log('Horario bloqueado exitosamente.');
        req.flash('success', 'Horario bloqueado con éxito.');
        res.redirect(`/horarios/${idMedico}`);
    } catch (error) {
        console.error('Error al bloquear el horario:', error);
        req.flash('error', 'Error al bloquear el horario: ' + error.message);
        return res.status(500).send('Error interno del servidor');
    }
};

exports.bloquearHorarioVM = async (req, res) => {
    const { idHorario } = req.params;
    const { idMedico } = req.body;

    try {
        // Actualizar el estado del horario a "Bloqueado"
        await db.query('UPDATE horarios_agendas SET estado = ?, bloqueado = 1, fechaBloqueo = NOW() WHERE idHorario = ?', ['Bloqueado', idHorario]);
        console.log('Horario bloqueado exitosamente.');
        req.flash('success', 'Horario bloqueado con éxito.');
        res.redirect(`/horarios/villa-mercedes/${idMedico}`);
    } catch (error) {
        console.error('Error al bloquear el horario:', error);
        req.flash('error', 'Error al bloquear el horario: ' + error.message);
        return res.status(500).send('Error interno del servidor');
    }
};




/*exports.mostrarHorarios = async (req, res) => {
    const idMedico = req.params.idMedico;
    try {
        // Obtener lista de médicos y pacientes
        const [medicos] = await db.query('SELECT idMedico, nombre FROM medicos WHERE Activo = 1');
        const [pacientes] = await db.query('SELECT idPaciente, nombreCompleto FROM pacientes where Activo = 1');
        const especialidades = await obtenerEspecialidades(idMedico);
        console.log('Especialidades:', especialidades);
 
        // Obtener los horarios del médico
        const [horarios] = await db.query(`
            SELECT ha.*, m.nombre AS nombreMedico 
            FROM horarios_agendas ha 
            JOIN medicos m ON ha.idMedico = m.idMedico 
            WHERE ha.idMedico = ?`,
            [idMedico]
        );
 
        // Formatear la fecha y verificar si hay horarios
        const formatDate = (date) => {
            const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', locale: 'es-ES' };
            return date.toLocaleDateString('es-ES', options);
        };
 
        if (horarios.length > 0) {
            horarios.forEach(horario => {
                horario.fechaFormateada = formatDate(new Date(horario.fecha));
            });
        }
 
        res.render('horarios', {
            medicos,
            pacientes,
            horarios,
            nombreMedico: horarios.length > 0 ? horarios[0].nombreMedico : 'Desconocido',
            especialidades
        });
    } catch (error) {
        console.error('Error al obtener los horarios:', error);
        res.status(500).send('Error al obtener los horarios');
    }
};*/

exports.mostrarHorarios = async (req, res) => {
    const idMedico = req.params.idMedico;

    try {
        // Obtener el nombre del médico
        const [medico] = await db.query('SELECT nombre FROM medicos WHERE idMedico = ?', [idMedico]);
        const mensajes = req.flash('success');

        // Obtener los horarios del médico en "San Luis" junto con la especialidad específica de cada horario
        const [horarios] = await db.query(`
            SELECT h.*, DATE_FORMAT(h.fecha, '%d-%m-%Y') AS fechaFormateada, e.nombreEspecialidad 
            FROM horarios_agendas h
            JOIN especialidad e ON h.id_especialidad = e.idEspecialidad
            JOIN medicos_sucursales ms ON h.idMedico = ms.idMedico
            JOIN sucursal s ON ms.idSucursal = s.idSucursal
            WHERE s.nombre = 'San Luis' AND h.idMedico = ?
            ORDER BY h.fecha, h.horaInicio
        `, [idMedico]);

        // Obtener la lista de pacientes activos
        const [pacientes] = await db.query('SELECT idPaciente, nombreCompleto FROM pacientes WHERE Activo = 1');

        res.render('horarios', {
            nombreMedico: medico[0]?.nombre || 'Médico no encontrado',
            messages: {
                success: mensajes.length > 0 ? mensajes[0] : null // Pasar el mensaje a la vista
            },
            horarios,
            pacientes,
        });
    } catch (error) {
        console.error('Error al obtener los horarios:', error);
        res.status(500).send('Error al cargar los horarios');
    }
};


exports.mostrarHorariosSanLuis = async (req, res) => {
    try {
        const idMedico = req.params.idMedico;

        // Verificar que idMedico no sea undefined
        if (!idMedico) {
            console.error('ID de médico no proporcionado');
            return res.status(400).send('ID de médico no proporcionado');
        }

        const horarios = await HorariosMedicos.getByMedicoId(idMedico);

        // Obtener el nombre del médico
        const medico = await Medicos.getById(idMedico);
        if (!medico) {
            console.error('Médico no encontrado para el ID:', idMedico);
            return res.status(404).send('Médico no encontrado');
        }

        const messages = {
            success: 'Horarios cargados correctamente.',
            error: ''
        };

        const formattedHorarios = horarios.map(horario => ({
            ...horario,
            fechaFormateada: new Date(horario.fecha).toLocaleDateString("es-ES")
        }));

        const nombreMedico = medico.nombre;
        const [pacientes] = await db.query('SELECT idPaciente, nombreCompleto FROM pacientes WHERE Activo = 1');
        const especialidades = await Especialidad.obtenerEspecialidades(idMedico);

        res.render('horarios', { horarios: formattedHorarios, nombreMedico, pacientes, especialidades, messages });
    } catch (error) {
        console.error('Error al mostrar los horarios:', error);
        const messages = {
            success: '',
            error: 'Error al mostrar los horarios'
        };
        res.render('horarios', { horarios: [], nombreMedico: '', especialidades: [], messages });
    }
};







// Crear un nuevo horario
/*/exports.crearHorario = async (req, res) => {
    const { idMedico, diaSemana, horaInicio, horaFin } = req.body;
 
    try {
        const query = `INSERT INTO horarios_agendas (idMedico, diaSemana, horaInicio, horaFin, estado) VALUES (?, ?, ?, ?, 'Disponible')`;
        await db.query(query, [idMedico, diaSemana, horaInicio, horaFin]);
        res.redirect(`/horarios/${idMedico}`); // Redirigir a los horarios del médico
    } catch (error) {
        console.error('Error al crear el horario:', error);
        res.status(500).send('Error al crear el horario');
    }
};*/

// Crear un sobreturno
/*exports.crearSobreturno = async (req, res) => {
    const { idMedico, idPaciente, horaInicio, fecha, nuevoPaciente, nombreCompleto, dni, email } = req.body;
 
    // Verificar que todos los parámetros requeridos estén presentes
    if (!idMedico || !horaInicio || !fecha) {
        console.error('Faltan parámetros requeridos para crear un sobreturno.');
        return res.status(400).send('Faltan parámetros requeridos para crear un sobreturno.');
    }
 
    try {
        // Si es un nuevo paciente, primero deberías insertarlo en la base de datos
        let pacienteId = idPaciente; // Inicialmente se usa el paciente existente
 
        if (nuevoPaciente) {
            const [resultadoNuevoPaciente] = await db.query('INSERT INTO pacientes (nombreCompleto, dni, email) VALUES (?, ?, ?)', [nombreCompleto, dni, email]);
            pacienteId = resultadoNuevoPaciente.insertId; // Obtenemos el ID del nuevo paciente
        }
 
        // Insertar el sobreturno en la tabla turnos
        await db.query('INSERT INTO turnos (idMedico, idPaciente, horaInicio, fecha, tipo) VALUES (?, ?, ?, ?, ?)',
            [idMedico, pacienteId, horaInicio, fecha, 'sobreturno']
        );
 
        res.status(201).send('Sobreturno creado con éxito.');
    } catch (error) {
        console.error('Error al crear el sobreturno:', error);
        res.status(500).send('Error al crear el sobreturno.');
    }
};*/

// Villa Mercedes
exports.obtenerHorariosVillaMercedes = async (req, res) => {
    try {
        const idMedico = req.params.idMedico;

        // Verificar que idMedico no sea undefined
        if (!idMedico) {
            console.error('ID de médico no proporcionado');
            return res.status(400).send('ID de médico no proporcionado');
        }

        const horarios = await HorariosMedicos.getByMedicoIdVM(idMedico);

        // Obtener el nombre del médico
        const medico = await Medicos.getById(idMedico);
        if (!medico) {
            console.error('Médico no encontrado para el ID:', idMedico);
            return res.status(404).send('Médico no encontrado');
        }

        const messages = {
            success: 'Horarios cargados correctamente.',
            error: ''
        };

        const formattedHorarios = horarios.map(horario => ({
            ...horario,
            fechaFormateada: new Date(horario.fecha).toLocaleDateString("es-ES")
        }));

        const nombreMedico = medico.nombre;
        const [pacientes] = await db.query('SELECT idPaciente, nombreCompleto FROM pacientes WHERE Activo = 1');
        const especialidades = await Especialidad.obtenerEspecialidadesVM(idMedico);

        res.render('horariosVillaMercedes', { horarios: formattedHorarios, nombreMedico, pacientes, especialidades, messages });
    } catch (error) {
        console.error('Error al mostrar los horarios:', error);
        const messages = {
            success: '',
            error: 'Error al mostrar los horarios'
        };
        res.render('horariosVillaMercedes', { horarios: [], nombreMedico: '', especialidades: [], messages });
    }
};

exports.obtenerHorariosSLPac = async (req, res) => {
    try {
        const idMedico = req.params.idMedico;

        if (!idMedico) {
            console.error('ID de médico no proporcionado');
            return res.status(400).send('ID de médico no proporcionado');
        }

        const horarios = await HorariosMedicos.getByMedicoId(idMedico);

        // Obtener el nombre del médico
        const medico = await Medicos.getById(idMedico);
        if (!medico) {
            console.error('Médico no encontrado para el ID:', idMedico);
            return res.status(404).send('Médico no encontrado');
        }

        const messages = {
            success: 'Horarios cargados correctamente.',
            error: ''
        };

        const formattedHorarios = horarios.map(horario => ({
            ...horario,
            fechaFormateada: new Date(horario.fecha).toLocaleDateString("es-ES")
        }));

        const nombreMedico = medico.nombre;
        const [pacientes] = await db.query('SELECT idPaciente, nombreCompleto FROM pacientes WHERE Activo = 1');
        const especialidades = await Especialidad.obtenerEspecialidades(idMedico);

        res.render('horariosSanLuisPac', { horarios: formattedHorarios, nombreMedico, pacientes, especialidades, messages });
    } catch (error) {
        console.error('Error al mostrar los horarios:', error);
        const messages = {
            success: '',
            error: 'Error al mostrar los horarios'
        };
        res.render('horariosSanLuisPac', { horarios: [], nombreMedico: '', especialidades: [], messages });
    }
};



exports.mostrarHorariosDesdePac = async (req, res) => {
    const idMedico = req.params.idMedico;
    const usuarioLogueado = req.user;
    console.log('Usuario logueado:', usuarioLogueado);

    try {
        // Obtener el nombre del médico
        const [medico] = await db.query('SELECT nombre FROM medicos WHERE idMedico = ?', [idMedico]);
        const mensajes = req.flash('success');
        // Obtener los horarios del médico junto con la especialidad específica de cada horario
        const [horarios] = await db.query(`
            SELECT h.*, DATE_FORMAT(h.fecha, '%d-%m-%Y') AS fechaFormateada, e.nombreEspecialidad 
            FROM horarios_agendas h
            JOIN especialidad e ON h.id_especialidad = e.idEspecialidad
            WHERE h.ciudad = ? AND h.idMedico = ?
            ORDER BY h.fecha, h.horaInicio
        `, ['San Luis', idMedico]);

        // Obtener la lista de pacientes (para seleccionar al asignar un turno)
        const [pacientes] = await db.query('SELECT idPaciente, nombreCompleto FROM pacientes where Activo = 1');

        res.render('horariosDesdePac', {
            nombreMedico: medico[0]?.nombre || 'Médico no encontrado',
            messages: {
                success: mensajes.length > 0 ? mensajes[0] : null
            },
            horarios,
            pacientes,
            usuarioLogueado
        });
    } catch (error) {
        console.error('Error al obtener los horarios:', error);
        res.status(500).send('Error al cargar los horarios');
    }
};

// Muestra la vista para crear un horario
exports.formCrearHorario = async (req, res) => {
    try {
        // Obtener todos los médicos y especialidades disponibles para mostrarlos en el formulario
        const [medicos] = await db.execute('SELECT idMedico, nombre FROM medicos where Activo = 1');
        const [especialidades] = await db.execute('SELECT idEspecialidad, nombreEspecialidad FROM especialidad');

        res.render('crearHorario', {
            success: req.flash('success') || null,
            error: req.flash('error') || null,
            medicos,
            especialidades
        });
    } catch (error) {
        console.error('Error al cargar el formulario para crear horario:', error);
        res.status(500).send('Error al cargar el formulario para crear horario.');
    }
};


// Formulario de creación de horario
exports.agregarHorario = async (req, res) => {
    const { idMedico, idEspecialidad, diaSemana, fecha, horaInicio, horaFin, estado, ciudad } = req.body;

    try {
        await HorariosMedicos.create({
            idMedico,
            diaSemana,
            fecha,
            horaInicio,
            horaFin,
            estado,
            ciudad,
            id_especialidad: idEspecialidad,
            duracion: req.body.duracion || null,
            bloqueado: 0
        });

        req.flash('success', 'Horario creado con éxito');
        console.log('Horario creado exitosamente');
        res.redirect('/horarios/agregar');
    } catch (error) {
        console.error('Error al crear el horario:', error);
        req.flash('error', 'Error al crear el horario');
        res.redirect('/horarios/agregar');
    }
};


exports.obtenerHorariosVillaMercedesDesdePac = async (req, res) => {
    try {
        const idMedico = req.params.idMedico;

        // Verificar que idMedico no sea undefined
        if (!idMedico) {
            console.error('ID de médico no proporcionado');
            return res.status(400).send('ID de médico no proporcionado');
        }

        const horarios = await HorariosMedicos.getByMedicoIdVM(idMedico);

        // Obtener el nombre del médico
        const medico = await Medicos.getById(idMedico);
        if (!medico) {
            console.error('Médico no encontrado para el ID:', idMedico);
            return res.status(404).send('Médico no encontrado');
        }

        const messages = {
            success: 'Horarios cargados correctamente.',
            error: ''
        };

        const formattedHorarios = horarios.map(horario => ({
            ...horario,
            fechaFormateada: new Date(horario.fecha).toLocaleDateString("es-ES")
        }));

        const nombreMedico = medico.nombre;
        const [pacientes] = await db.query('SELECT idPaciente, nombreCompleto FROM pacientes WHERE Activo = 1');
        const especialidades = await Especialidad.obtenerEspecialidadesVM(idMedico);

        res.render('horariosVillaMercedesPac', { horarios: formattedHorarios, nombreMedico, pacientes, especialidades, messages });
    } catch (error) {
        console.error('Error al mostrar los horarios:', error);
        const messages = {
            success: '',
            error: 'Error al mostrar los horarios'
        };
        res.render('horariosVillaMercedesPac', { horarios: [], nombreMedico: '', especialidades: [], messages });
    }
};




//Inicio de sesión como paciente
exports.verHorariosDisponiblesComoPac = async (req, res) => {
    const { sucursal, especialidad } = req.query;

    // const usuarioAutenticado = req.user || null;
    // if (!usuarioAutenticado) {
    //     return res.redirect('/dashboard');
    // }

    // console.log('Usuario autenticado:', usuarioAutenticado);

    try {

        // Asegúrate de que el usuario esté autenticado
        if (!req.isAuthenticated()) {
            return res.redirect('/login'); // O lo que sea tu ruta de login
        }

        const usuarioAutenticado = req.user; // Obtienes el idPaciente
        const [pacienteData] = await db.query('SELECT nombreCompleto FROM pacientes WHERE idPaciente = ?', [usuarioAutenticado.idPaciente]);

        if (pacienteData.length > 0) {
            // Agregar el nombreCompleto al objeto usuarioAutenticado
            usuarioAutenticado.nombreCompleto = pacienteData[0].nombreCompleto;
        }
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


        res.render('horariosLibresComoPac', {
            usuarioAutenticado,
            sucursales,
            especialidades,
            medicos,
            pacientes,
            horarios: [],
            success: null,
            error: null,
            filtros: { sucursal, especialidad },
        });
    } catch (error) {
        console.error('Error al cargar datos:', error);
        res.status(500).send('Hubo un problema al cargar la página.');
    }
};

exports.filtrarHorariosDisponiblesComoPac = async (req, res) => {
    const { idSucursal, idEspecialidad, idMedico, año, mes } = req.body;

    // const usuarioAutenticado = req.user || null;

    // if (!usuarioAutenticado) {
    //     return res.redirect('/dashboard');
    // }
    // console.log('Usuario autenticado:', usuarioAutenticado);

    try {

        // Asegúrate de que el usuario esté autenticado
        if (!req.isAuthenticated()) {
            return res.redirect('/login'); // O lo que sea tu ruta de login
        }

        const usuarioAutenticado = req.user; // Obtienes el idPaciente
        const [pacienteData] = await db.query('SELECT nombreCompleto FROM pacientes WHERE idPaciente = ?', [usuarioAutenticado.idPaciente]);

        if (pacienteData.length > 0) {
            // Agregar el nombreCompleto al objeto usuarioAutenticado
            usuarioAutenticado.nombreCompleto = pacienteData[0].nombreCompleto;
        }
        // Cargar sucursales para el formulario
        const [sucursales] = await db.query('SELECT idSucursal, nombre FROM sucursal');

        if (!idSucursal || !idEspecialidad || !idMedico || !año || !mes) {
            return res.render('horariosLibresComoPac', {
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

        res.render('horariosLibresComoPac', {
            usuarioAutenticado: req.user,
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
        res.render('horariosLibresComoPac', {
            horarios: [],
            sucursales,
            especialidades: [],
            medicos: [],
            success: null,
            error: 'Hubo un problema al cargar los horarios.',
            filtros: { idSucursal, idEspecialidad, idMedico, año, mes }
        });
    }
};

exports.reservarTurnosComoPac = async (req, res) => {
    const { idMedico, horaInicio, fecha, idPaciente, idSucursal, clasificacion, idHorario, esSobreturno } = req.body;
    console.log('Datos recibidos:', req.body);

    // if (idPaciente !== req.user.idPaciente) {
    //     return res.status(403).json({
    //         success: false,
    //         error: 'No tienes permiso para realizar esta acción.'
    //     });
    // }

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

        res.json({ success: true, message: 'Turno reservado con éxito. A la brevedad nos comunicaremos con Ud. para confirmar el turno por los medios de contacto indicados.' });
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
};





//Horarios y turnos disponibles desde admisión versión 2
exports.verHorariosDisponiblesDesdeAdmision = async (req, res) => {
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
        res.render('horariosLibres2', {
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
}


exports.filtrarHorariosDisponiblesDesdeAdmision = async (req, res) => {
    const { idSucursal, idEspecialidad, idMedico, año, mes } = req.body;
    try {
        // Cargar sucursales para el formulario
        const [sucursales] = await db.query('SELECT idSucursal, nombre FROM sucursal');

        if (!idSucursal || !idEspecialidad || !idMedico || !año || !mes) {
            return res.render('horariosLibres2', {
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


        res.render('horariosLibres2', {
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
        res.render('horariosLibres2', {
            horarios: [],
            sucursales,
            especialidades: [],
            medicos: [],
            success: null,
            error: 'Hubo un problema al cargar los horarios.',
            filtros: { idSucursal, idEspecialidad, idMedico, año, mes }
        });
    }
}