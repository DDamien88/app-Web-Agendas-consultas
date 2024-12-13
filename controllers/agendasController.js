const Agenda = require('../models/Agenda');
const Medico = require('../models/Medico');
const Especialidad = require('../models/Especialidad');
const db = require('../config/db');
const { parseISO, format, addDays, addMinutes } = require('date-fns');
const { esFeriado } = require('../config/feriados');

exports.mostrarAgendas = async (req, res) => {
    try {
        const [agendas] = await db.query(`
            SELECT 
                a.idAgenda, 
                a.activo, 
                a.intervalos, 
                a.cantSobreTurnos, 
                m.nombre AS nombreMedico, 
                e.nombreEspecialidad, 
                s.nombre AS nombreSucursal
            FROM agendas_medicos a
            JOIN medicos m ON a.idMedico = m.idMedico
            JOIN especialidad e ON a.idEspecialidad = e.idEspecialidad
            JOIN medico_especialidad me ON a.idMedico = me.idMedico AND a.idEspecialidad = me.idEspecialidad
            JOIN sucursal s ON me.idSucursal = s.idSucursal;
        `);

        res.render('agendas', { agendas });
    } catch (error) {
        console.error('Error al obtener las agendas:', error);
        res.status(500).send('Error al cargar las agendas.');
    }
};




/*exports.mostrarEditarAgenda = async (req, res) => {
    const { idAgenda } = req.params;
    try {
        const [agenda] = await db.query('SELECT *, e.nombreEspecialidad, m.nombre AS nombreMedico, s.nombre AS sucursal ' +
            ' FROM agendas_medicos am ' +
            '  INNER JOIN especialidad e ON am.idEspecialidad = e.idEspecialidad ' +
            '  INNER JOIN medico_especialidad me ON am.idEspecialidad = me.idEspecialidad ' +
            '  INNER JOIN sucursal s ON me.idSucursal = s.idSucursal ' +
            '  INNER JOIN medicos m ON am.idMedico = m.idMedico ' +
            '  WHERE am.activo = 1 ', [idAgenda]);
        if (!agenda) {
            return res.status(404).send('Agenda no encontrada');
        }
        const [medicos] = await db.query('SELECT idMedico, nombre FROM medicos WHERE activo = 1');
        const [sucursales] = await db.query('SELECT * FROM sucursal');
        const [especialidades] = await db.query('SELECT * FROM especialidad');

        console.log('Agenda encontrada:', agenda);
        res.render('editarAgenda', { medicos, sucursales, especialidades, agenda });
    } catch (error) {
        console.error('Error al obtener datos:', error);
        res.status(500).send('Error interno del servidor');
    }
};*/


/*exports.editarAgenda = async (req, res) => {
    const { idAgenda } = req.params;
    const { idSucursal, idEspecialidad, idMedico, duracion, fecha } = req.body;

    console.log('idAgenda recibido:', idAgenda);
    console.log('Datos recibidos:', req.body);

    try {
        // Validar que todos los datos requeridos estén presentes
        if (!idSucursal || !idEspecialidad || !idMedico || !duracion || !fecha) {
            return res.status(400).json({ error: "Todos los campos son obligatorios." });
        }

        // Actualizar la tabla agendas_medicos
        const [resultAgenda] = await db.query(`
            UPDATE agendas_medicos 
            SET idEspecialidad = ?, idMedico = ?, intervalos = ?, activo = 1, cantSobreTurnos = 3
            WHERE idAgenda = ?
        `, [idEspecialidad, idMedico, duracion, idAgenda]);

        if (resultAgenda.affectedRows === 0) {
            return res.status(400).json({ error: "No se pudo actualizar la agenda médica." });
        }

        // Preparar los horarios para la actualización
        const horarios = [];
        const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

        for (let i = 0; i < 7; i++) {
            horarios.push({
                horaInicioManana: req.body[`horarios[${i}][horaInicioManana]`] || null,
                horaFinManana: req.body[`horarios[${i}][horaFinManana]`] || null,
                horaInicioTarde: req.body[`horarios[${i}][horaInicioTarde]`] || null,
                horaFinTarde: req.body[`horarios[${i}][horaFinTarde]`] || null,
            });
        }

        // Actualizar la tabla horarios_de_agendas
        for (const [idx, dia] of diasSemana.entries()) {
            const diaHorarios = horarios[idx];

            if (diaHorarios) {
                const { horaInicioManana, horaFinManana, horaInicioTarde, horaFinTarde } = diaHorarios;

                // Ajustar fecha de inicio al siguiente día de la semana si es necesario
                const fechaInicio = new Date(fecha);
                const diferenciaDias = (idx - fechaInicio.getDay() + 7) % 7; // Calcular días hasta el próximo día
                if (diferenciaDias > 0) {
                    fechaInicio.setDate(fechaInicio.getDate() + diferenciaDias);
                }

                // Actualizar los horarios por día en la base de datos
                if (horaInicioManana && horaFinManana) {
                    await db.query(`
                        UPDATE horarios_de_agendas
                        SET horaInicio = ?, horaFin = ?, estado = 1
                        WHERE agenda = ? AND fecha = ? AND turno = 'mañana'
                    `, [horaInicioManana, horaFinManana, idAgenda, fechaInicio.toISOString().split('T')[0]]);
                }

                if (horaInicioTarde && horaFinTarde) {
                    await db.query(`
                        UPDATE horarios_de_agendas
                        SET horaInicio = ?, horaFin = ?, estado = 1
                        WHERE agenda = ? AND fecha = ? AND turno = 'tarde'
                    `, [horaInicioTarde, horaFinTarde, idAgenda, fechaInicio.toISOString().split('T')[0]]);
                }
            }
        }

        return res.status(200).json({ message: "Agenda y horarios actualizados correctamente." });

    } catch (error) {
        console.error("Error al actualizar la agenda y los horarios:", error);
        return res.status(500).json({ error: "Error interno al procesar la actualización." });
    }
};


// Función auxiliar para generar turnos
function generarTurnos(fecha, horaInicio, horaFin, duracion, idAgenda, estado) {
    const turnos = [];
    const inicio = new Date(`${fecha.toISOString().split('T')[0]}T${horaInicio}`);
    const fin = new Date(`${fecha.toISOString().split('T')[0]}T${horaFin}`);

    while (inicio < fin) {
        const finTurno = new Date(inicio.getTime() + duracion * 60000); // Sumar duración en minutos
        if (finTurno > fin) break; // No exceder la hora final

        turnos.push([fecha.toISOString().split('T')[0], inicio.toTimeString().split(' ')[0], finTurno.toTimeString().split(' ')[0], estado, false, idAgenda]);
        inicio.setTime(finTurno.getTime()); // Avanzar al siguiente turno
    }

    return turnos;
}*/


exports.mostrarEditarHorarios = async (req, res) => {
    const { idAgenda } = req.params;
    //console.log("agenda:", idAgenda);

    try {
        const [agenda] = await db.query(`
            SELECT DISTINCT 
                    am.idAgenda, 
                    m.nombre AS nombreMedico, 
                    e.nombreEspecialidad, 
                    s.nombre AS sucursal,
                    s.idSucursal
                FROM agendas_medicos am
                JOIN medico_especialidad me ON am.idEspecialidad = me.idEspecialidad AND am.idMedico = me.idMedico
                JOIN medicos m ON m.idMedico = me.idMedico
                JOIN especialidad e ON am.idEspecialidad = e.idEspecialidad
                JOIN sucursal s ON me.idSucursal = s.idSucursal
            WHERE am.idAgenda = ? AND am.activo = 1
        `, [idAgenda]);

        if (!agenda) {
            return res.status(404).send('Agenda no encontrada');
        }

        agendaData = agenda[0];

        res.render('editarAgenda', { agenda: agendaData });
    } catch (error) {
        console.error('Error al obtener agenda o horarios:', error);
        res.status(500).send('Error interno del servidor');
    }
};


//Funciona!!! al editar una agenda
// exports.actualizarHorarios = async (req, res) => {
//     const { idAgenda } = req.params;
//     console.log('Agenda:', idAgenda);
//     const { fecha, dias } = req.body;

//     if (!fecha || !dias) {
//         return res.status(400).json({ error: "Todos los campos son obligatorios." });
//     }

//     const horarios = Array.from({ length: 7 }).map((_, i) => ({
//         horaInicioManana: req.body[`horarios[${i}][horaInicioManana]`] || null,
//         horaFinManana: req.body[`horarios[${i}][horaFinManana]`] || null,
//         horaInicioTarde: req.body[`horarios[${i}][horaInicioTarde]`] || null,
//         horaFinTarde: req.body[`horarios[${i}][horaFinTarde]`] || null,
//     }));

//     try {
//         // Buscar la agenda seleccionada
//         const [agendaData] = await db.query(
//             `SELECT idAgenda, idMedico, idEspecialidad, cantSobreTurnos FROM agendas_medicos WHERE idAgenda = ?`,
//             [idAgenda]
//         );

//         if (!agendaData || agendaData.length === 0) {
//             return res.status(400).json({ error: "La agenda seleccionada no es válida." });
//         }

//         // Verificar si ya existen horarios para la agenda seleccionada
//         const [horas] = await db.query(
//             `SELECT * FROM horarios_de_agendas WHERE agenda = ?`,
//             [idAgenda]
//         );

//         // if (horas.length > 0)
//         //     return res.status(400).json({
//         //         error: "YA EXISTEN TURNOS PARA ÉSTA AGENDA. PUEDE IR A EDITARLA"
//         //     });



//         const { idMedico, idEspecialidad, cantSobreTurnos } = agendaData[0];

//         const fechaInicio = parseISO(fecha);
//         const horariosFinales = [];

//         const generarIntervalos = (fecha, horaInicio, horaFin, duracion, cantSobreTurnos) => {
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
//                         estado: 'libre',
//                         bloqueado: 0,
//                         agenda: idAgenda,
//                         esSobreTurno: 0,
//                     });

//                     // Sobreturnos
//                     for (let i = 0; i < cantSobreTurnos; i++) {
//                         intervalos.push({
//                             fecha,
//                             horaInicio: format(inicio, "HH:mm"),
//                             horaFin: format(horaFinIntervalo, "HH:mm"),
//                             estado: 'libre',
//                             bloqueado: 0,
//                             agenda: idAgenda,
//                             esSobreTurno: 1,
//                         });
//                     }
//                 }
//                 inicio = horaFinIntervalo;
//             }
//             return intervalos;
//         };

//         // Generar los intervalos de horarios para cada día
//         for (let dia = 0; dia < dias; dia++) {
//             const fechaActual = format(addDays(fechaInicio, dia), "yyyy-MM-dd");

//             // Verificar si la fecha es un feriado
//             if (esFeriado(fechaActual)) {
//                 console.log(`Se omite la fecha ${fechaActual} por ser feriado.`);
//                 continue; 
//             }

//             const diaSemana = (fechaInicio.getDay() + dia) % 7;
//             const diaFormulario = (diaSemana + 6) % 7;

//             const { horaInicioManana, horaFinManana, horaInicioTarde, horaFinTarde } = horarios[diaFormulario];

//             if (horaInicioManana && horaFinManana) {
//                 horariosFinales.push(
//                     ...generarIntervalos(fechaActual, horaInicioManana, horaFinManana, 30, cantSobreTurnos)
//                 );
//             }
//             if (horaInicioTarde && horaFinTarde) {
//                 horariosFinales.push(
//                     ...generarIntervalos(fechaActual, horaInicioTarde, horaFinTarde, 30, cantSobreTurnos) // Usando 30 minutos por defecto
//                 );
//             }
//         }

//         // Insertar los horarios generados en la base de datos
//         if (horariosFinales.length > 0) {
//             const sql = `INSERT INTO horarios_de_agendas (fecha, horaInicio, horaFin, estado, bloqueado, agenda, esSobreTurno) VALUES ?`;
//             const values = horariosFinales.map((h) => [
//                 h.fecha,
//                 h.horaInicio,
//                 h.horaFin,
//                 h.estado,
//                 h.bloqueado,
//                 h.agenda,
//                 h.esSobreTurno,
//             ]);
//             await db.query(sql, [values]);
//         }

//         res.redirect('/agendas');
//     } catch (error) {
//         console.error("Error al generar horarios:", error);
//         return res.status(500).json({ error: "Error interno del servidor." });
//     }
// };

exports.actualizarHorarios = async (req, res) => {
    const { idAgenda } = req.params;
    console.log('Agenda:', idAgenda);
    const { fecha, dias } = req.body;

    if (!fecha || !dias) {
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
            [idAgenda]
        );

        if (!agendaData || agendaData.length === 0) {
            return res.status(400).json({ error: "La agenda seleccionada no es válida." });
        }

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
                        agenda: idAgenda,
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
                            agenda: idAgenda,
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
                continue;
            }

            const diaSemana = (fechaInicio.getDay() + dia) % 7;
            const diaFormulario = (diaSemana + 6) % 7;

            const { horaInicioManana, horaFinManana, horaInicioTarde, horaFinTarde } = horarios[diaFormulario];

            if (horaInicioManana && horaFinManana) {
                horariosFinales.push(
                    ...generarIntervalos(fechaActual, horaInicioManana, horaFinManana, 30, cantSobreTurnos)
                );
            }
            if (horaInicioTarde && horaFinTarde) {
                horariosFinales.push(
                    ...generarIntervalos(fechaActual, horaInicioTarde, horaFinTarde, 30, cantSobreTurnos) // Usando 30 minutos por defecto
                );
            }
        }

        // Actualizar o insertar horarios en la base de datos
        for (const horario of horariosFinales) {
            const [existingHorario] = await db.query(
                `SELECT * FROM horarios_de_agendas WHERE agenda = ? AND fecha = ? AND horaInicio = ? AND horaFin = ?`,
                [horario.agenda, horario.fecha, horario.horaInicio, horario.horaFin]
            );

            if (existingHorario.length > 0) {
                // Si el horario existe, actualizarlo
                await db.query(
                    `UPDATE horarios_de_agendas 
                    SET estado = ?, bloqueado = ?, esSobreTurno = ? 
                    WHERE agenda = ? AND fecha = ? AND horaInicio = ? AND horaFin = ?`,
                    [
                        horario.estado,
                        horario.bloqueado,
                        horario.esSobreTurno,
                        horario.agenda,
                        horario.fecha,
                        horario.horaInicio,
                        horario.horaFin,
                    ]
                );
            } else {
                // Si el horario no existe, insertarlo
                await db.query(
                    `INSERT INTO horarios_de_agendas (fecha, horaInicio, horaFin, estado, bloqueado, agenda, esSobreTurno) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        horario.fecha,
                        horario.horaInicio,
                        horario.horaFin,
                        horario.estado,
                        horario.bloqueado,
                        horario.agenda,
                        horario.esSobreTurno,
                    ]
                );
            }
        }

        res.redirect('/agendas');
    } catch (error) {
        console.error("Error al generar o actualizar horarios:", error);
        return res.status(500).json({ error: "Error interno del servidor." });
    }
};










exports.eliminarAgenda = async (req, res) => {
    const { idAgenda } = req.params;
    try {
        await db.query(`UPDATE horarios_de_agendas SET estado = 0  WHERE agenda = ?`, [idAgenda]);

        await db.query(`UPDATE agendas_medicos SET activo = 0 WHERE idAgenda = ?`, [idAgenda]);

        //res.status(200).json({ success: "Agenda y horarios dados de baja correctamente" });
        res.redirect('/agendas');
    } catch (error) {
        console.error('Error al eliminar la agenda y sus horarios:', error);
        //res.status(500).json({ error: "Error al eliminar la agenda y sus horarios." });
        res.redirect('/agendas');
    }
};






//Versión 2 Eliminar agenda
// exports.eliminarAgenda = async (req, res) => {
//     const { idAgenda } = req.params;
//     try {
//         await db.query(`DELETE FROM horarios_de_agendas WHERE agenda = ?`, [idAgenda]);

//         await db.query(`DELETE FROM agendas_medicos WHERE idAgenda = ?`, [idAgenda]);

//         res.status(200).json({ success: "Agenda y horarios eliminados correctamente" });
//     } catch (error) {
//         console.error('Error al eliminar la agenda y sus horarios:', error);
//         res.status(500).json({ error: "Error al eliminar la agenda y sus horarios." });
//     }
// };


exports.activarAgenda = async (req, res) => {
    const { idAgenda } = req.params;
    try {
        await db.query(`UPDATE horarios_de_agendas SET estado = 'libre'  WHERE agenda = ?`, [idAgenda]);

        await db.query(`UPDATE agendas_medicos SET activo = 1 WHERE idAgenda = ?`, [idAgenda]);

        //res.status(200).json({ success: "Agenda y horarios dados de Alta correctamente" });
        res.redirect('/agendas');
    } catch (error) {
        console.error('Error al eliminar la agenda y sus horarios:', error);
        //res.status(500).json({ error: "Error al eliminar la agenda y sus horarios." });
        res.redirect('/agendas');
    }
};








/*exports.consultarAgendas = async (req, res) => {
    try {
        const filtros = {
            especialidad: req.query.especialidad,
            medico: req.query.medico,
            estado: req.query.estado,
            dia: req.query.dia,
        };

        const agendas = await Agenda.obtenerAgendasFiltradas(filtros);
        const medicos = await Medico.getAllActivos();
        const especialidades = await Especialidad.obtenerTodas();

        // Renderizar la vista con los datos
        res.render('agendas', {
            agendas,
            medicos,
            especialidades,
            formatDate, // Pasar la función a la vista
            formatTime, // Asegúrate de pasar la función formatTime también
            noResults: agendas.length === 0 // Indicar si no hay resultados
        });
    } catch (error) {
        console.error('Error al consultar las agendas:', error);
        res.status(500).send('Error al consultar las agendas');
    }
};*/

// Función para formatear la fecha
function formatDate(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(date).toLocaleDateString('es-ES', options);
}

// Función para formatear la hora
function formatTime(time) {
    if (!time) {
        return 'Hora no disponible'; // Retornar un mensaje por defecto si la hora es nula
    }
    const [hours, minutes] = time.split(':');
    return `${hours}:${minutes}`;
}


exports.listarBloqueos = async (req, res) => {
    try {
        const [bloqueos] = await db.query(`
        SELECT 
          ba.idBloqueo, 
          ba.fechaInicio, 
          ba.fechaFin, 
          ba.motivo, 
          m.nombre AS nombreMedico, 
          s.nombre AS nombreSucursal, 
          a.idAgenda
        FROM bloqueos_agenda ba
        LEFT JOIN medicos m ON ba.idMedico = m.idMedico
        LEFT JOIN sucursal s ON ba.idSucursal = s.idSucursal
        LEFT JOIN agendas_medicos a ON ba.idAgenda = a.idAgenda
      `);

        res.render('listarBloqueosAgenda', { bloqueos });
    } catch (error) {
        console.error('Error al listar los bloqueos de agenda:', error);
        res.status(500).send('Error al cargar los bloqueos de agenda');
    }
};

exports.eliminarBloqueo = async (req, res) => {
    const { idBloqueo } = req.params;
    try {
        await db.query(`DELETE FROM bloqueos_agenda WHERE idBloqueo = ?`, [idBloqueo]);
        res.redirect('/agendas/bloqueos-agenda');
    } catch (error) {
        console.error('Error al eliminar el bloqueo de agenda:', error);
        res.status(500).send('Error al eliminar el bloqueo de agenda');
    }

}



exports.mostrarFormularioBloqueo = async (req, res) => {
    try {
        const [medicos] = await db.query('SELECT idMedico, nombre FROM medicos WhERE Activo = 1');
        const [sucursales] = await db.query('SELECT idSucursal, nombre FROM sucursal');
        const [agendas] = await db.query('SELECT idAgenda, idMedico FROM agendas_medicos WHERE activo = 1');

        //const medicoSeleccionado = medicos[0];

        res.render('bloqueosAgenda', {
            medicos,
            sucursales,
            agendas,
            medicoSeleccionado: null
        });
    } catch (error) {
        console.error('Error al cargar la vista de bloqueo de agenda:', error);
        res.status(500).send('Error al cargar la vista de bloqueo de agenda');
    }
};




exports.crearBloqueo = async (req, res) => {
    const { idMedico, idSucursal, idAgenda, fechaInicio, fechaFin, motivo } = req.body;

    // Validación de campos obligatorios
    if (!idMedico || !idSucursal || !idAgenda || !fechaInicio || !fechaFin || !motivo) {
        return res.render('bloqueosAgenda', {
            error_msg: 'Todos los campos son obligatorios.',
            medicos: await db.query('SELECT * FROM medicos WHERE Activo = 1'), // Consulta corregida
            // Opcional: También puedes incluir valores previos para evitar que el usuario los reescriba
            valoresPrevios: { idMedico, idSucursal, idAgenda, fechaInicio, fechaFin, motivo },
        });
    }

    try {
        // Intentar insertar el bloqueo
        await db.query(
            'INSERT INTO bloqueos_agenda (idMedico, idSucursal, idAgenda, fechaInicio, fechaFin, motivo) VALUES (?, ?, ?, ?, ?, ?)',
            [idMedico, idSucursal, idAgenda, fechaInicio, fechaFin, motivo]
        );

        // Actualizar horarios de la agenda
        await db.query(
            'UPDATE horarios_de_agendas SET estado = 0 WHERE fecha >= ? AND fecha <= ? AND agenda = ? AND estado = "libre"',
            [fechaInicio, fechaFin, idAgenda]
        );

        return res.render('bloqueosAgenda', {
            success_msg: 'Bloqueo creado con éxito.',
            medicos: await db.query('SELECT * FROM medicos WHERE Activo = 1'),
        });
    } catch (error) {
        // Manejo específico del error Duplicate Entry
        error_msg = 'Error al crear el bloqueo. Intente nuevamente.';

        console.error('Error al crear el bloqueo en agenda:', error);

        return res.render('bloqueosAgenda', {
            error_msg,
            medicos: await db.query('SELECT * FROM medicos WHERE Activo = 1'),
            valoresPrevios: { idMedico, idSucursal, idAgenda, fechaInicio, fechaFin, motivo }, // Persistir valores
        });
    }
};


