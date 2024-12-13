# Integrador laboratorio 2

## - Aplicación web - Agenda de consultorios

La aplicación “agenda de consultas médicas” consiste en una aplicación para la programación de horarios de consultas médicas.

La programación de horarios soporta el agendamiento de pacientes que necesitan realizar una consulta médica a una determinada especialidad (Ej. Cardiología, Neurología, Neumología, etc.)

La aplicación centraliza en una única aplicación los agendamientos que se dan en toda la red de consultorios/clínicas de la organización.

Sus principales características deberán ser:

-   Disponer de la mayor agilidad en la programación de citas, a causa de la disponibilidad de visualizar en una única pantalla todos los profesionales
-   Facilidades en los recursos de copias y transferencias de programaciones.
-   Practicidad al momento de programar un agendamiento como también al momento de la cita.

Las agendas estarán organizadas por sucursal y dispondrán de 2 tipos de clasificación:

-   Un tipo de clasificación customizable por la organización (Por ej. podría utilizarse para diferencias los tipos de consultas: Normal, especial, VIP, etc)
-   Por especialidad, esta clasificación quedará determinada por la especialidad del médico de la agenda.


# Programación de horarios

La programación de un horario para una agenda se realiza a partir de que el paciente concurre al consultorio/sucursal y solicita una reserva para determinado médico (considere que este paso podría realizarse por algún otro mecanismo remoto. Ej. teléfono, whatsapp, mail, etc). En este momento la secretaria solicita al paciente la siguiente información: Nombre completo, DNI, motivo de consulta (opcional), obra social y datos de contacto para luego acordar un horario (fecha y hora disponible) para la cita.

El sistema debe facilitar la búsqueda de horarios disponibles para la agenda solicitada como así también el registro de la información del turno.

Al momento de confirmar la programación el estado del turno pasará a reservado.

Llegado el caso de que no existieran turnos disponibles a corto plazo la secretaría podría registrar el paciente en una lista de espera del profesional o de la especialidad para que si se liberaran turnos este pudiera ser considerado.

En todo momento la aplicación debe permitir a la secretaria consultar las agendas/horarios disponibles y/o programados. Para cumplir satisfactoriamente esta necesidad las agendas deben poder consultarse/filtrarse por diferentes criterios.

Filtros por clasificación, especialidad médica, médico, estados de los turnos, día y combinaciones de estos.

La aplicación debe permitir transferir/copiar pacientes entre agendas actualizando toda la información necesaria para que los turnos reflejen esta acción.

## Sobreturnos


La aplicación debe permitir generar horarios especiales (conocidos como sobreturnos). Estos horarios especiales pueden compartir el mismo horario de programación que un turno de la agenda siempre y cuando el horario este reservado. Cada agenda puede tener una cantidad máxima de sobreturnos en el día (diferentes para cada agenda).

## Profesionales


Los profesionales deberán ser registrados por usuarios que tengan rol de administrador, los profesionales pueden tener mas de una especialidad, donde por cada especialidad tienen una matrícula habilitante. El profesional podrá disponer de una agenda por especialidad.

## Estados de las agendas

Las agendas deben disponer de horarios (que se corresponden con los turnos para las citas). Cada agenda puede tener una planificación diferente de horarios. Para ello se debe disponer de una función de configuración de agendas que pueda planificar los horarios.

Por ejemplo, una agenda puede tener horarios de 30 minutos, con horarios disponibles los Lunes, Miércoles y Viernes de 8hs a 12hs.

Otra agenda puede tener horarios de 40 minutos, con horarios los Jueves de 16 a 21hs y los Viernes de 9 a 15hs.

Tener en cuenta que podría darse que existan turnos disponibles a la mañana y a la tarde con horarios no disponibles en el medio.

Los horarios se repetirán semanalmente, hasta que el profesional decida cambiarlos.

Es importante que la agenda pueda bloquear horarios de una agenda por improvistos o ausencias programadas (Ej. vacaciones del profesional)

Los horarios de las agendas podrán tener los siguientes estados:

-   No disponible (No puede ser reservado)
-   Libre (para ser reservado por una cita)
-   Reservada (horario reservado por el paciente, necesita que la admisión confirme el turno)
-   Confirmado (Horario confirmado por la admisión)
-   Cancelado (paciente cancela la cita hasta 24hs antes.)
-   Ausente (paciente no asistió a la cita)
-   Presente (paciente asistió a la cita)
-   En consulta (paciente esta siendo atendido por el profesional)
-   Atendido (paciente fue atendido por el profesional)

## Registro de pacientes

Cuando el paciente es nuevo el sistema debe solicitar la información personal completa y generar un registro de persona.

Si el paciente no es nuevo el sistema debe presentar la información de la persona para que esta pueda ser corroborada y actualizada si es necesario.

## Agendamiento por parte del paciente

El paciente puede registrarse online en el sistema y realizar la reserva del turno. La reserva del turno debe confirmarse por admisión para que el turno quede confirmado. Al registrarse deberá proveer todos los datos necesarios del mismo modo que si fuera presencial. Además, deberá subir una fotocopia del documento para que admisión la pueda validar.


# Calendario

El sistema debe proveer una función tal que los administradores puedan cargar los días no laborables del año para que estos no puedan ser planificados ni reservados en las agendas.

**Ejemplos de horarios que deberían ser soportados por la aplicación**

El Dr. Pepe tiene los siguientes turnos disponibles para agendamiento:

Del 1-Enero al 20 de Febrero:

-   Lunes, Miércoles y Viernes de 8:hs a 16hs;
-   Jueves de 9 a 12hs y de 16 a 20:30hs

Del 21 de Febrero y por 2 semanas se encuentra de Vacaciones

Del 15 de Marzo a 29 de Mayo

-   Lunes, Miércoles y Viernes de 8:hs a 16hs;
-   Jueves de 9 a 12hs y de 16 a 20:30hs

Del 30 de Mayo al 20 de Junio

-   Lunes, Miércoles y Viernes de 8:hs a 16hs;
-   Viernes de 8 a 12hs

Del 21 de Junio hacia adelante todavía no tiene planificado los horarios.

Todo horario que no este entre las reglas definidas debe figurar como “horario no disponible” en la agenda del profesional. También debe mostrarse en las agendas los horarios marcados como “vacaciones”.

 ***- Desarrollado con:***
	   - Node js
    - Express
    - Javascript
    - CSS
    - PUG
    - Patrón de arquitectura MVC
    - BD relacionales
    - MySQL
    - Express-session
    - Passport-github2
