// public/js/keepalive.js

// Enviar una señal al servidor cada 1000ms (1 segundo)
setInterval(() => {
    fetch('/api/heartbeat', { method: 'POST' })
        .catch(err => console.error("Servidor desconectado"));
}, 1000);