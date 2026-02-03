(() => {
    const shutdownButtons = document.querySelectorAll('.btn-shutdown');
    if (!shutdownButtons.length) {
        return;
    }

    const cerrarVentana = () => {
        window.open('', '_self');
        window.close();
    };

    shutdownButtons.forEach((button) => {
        button.addEventListener('click', async () => {
            try {
                await fetch('/api/shutdown', { method: 'POST' });
            } catch (error) {
                console.error('No se pudo cerrar el servidor.', error);
            } finally {
                cerrarVentana();
            }
        });
    });
})();
