// public/notificacion.js
function showNotification(message, type) {
    const notification = document.getElementById('notification');
    notification.innerHTML = message;
    notification.className = 'notification ' + type;
    // Ejemplo de cómo llamar a showNotification al recibir respuesta del servidor
    fetch('/turnos/asignar', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => {
            if (response.ok) {
                showNotification('Turno asignado exitosamente', 'success');
            } else {
                return response.text().then(text => { throw new Error(text); });
            }
        })
        .catch(error => {
            showNotification(`Error: ${error.message}`, 'error');
        });

    // Redirigir o recargar después de 3 segundos
    setTimeout(() => {
        if (type === 'success') {
            location.reload(); // Recargar la página actual
        } else {
            notification.className = 'notification'; // Ocultar mensaje si hay error
        }
    }, 3000);
}
