document.addEventListener('DOMContentLoaded', () => {
    
    // 1. REFERENCIAS A ELEMENTOS DEL HTML
    // Etiquetas de Texto (Resumen)
    const lblTotalProyectos = document.getElementById('lblTotalProyectos');
    const lblTotalInversion = document.getElementById('lblTotalInversion');
    const lblTotalSedes = document.getElementById('lblTotalSedes');
    const lblPromedioAvance = document.getElementById('lblPromedioAvance');

    // Filtros
    const filtroMunicipio = document.getElementById('filtroMunicipio');
    const filtroProyecto = document.getElementById('filtroProyecto');
    const filtroIndicador = document.getElementById('filtroIndicador');
    const btnLimpiar = document.getElementById('btnLimpiarFiltros');

    // Variables para guardar las gráficas y poder destruirlas al actualizar
    let evolutionChart = null;
    let distributionChart = null;

    // 2. INICIALIZACIÓN
    init();

    function init() {
        loadGeneralStats(); // Cargar tarjetas de arriba
        loadFilters();      // Llenar los selects
        updateCharts();     // Dibujar gráficas iniciales
    }

    // 3. CARGAR LAS TARJETAS DE RESUMEN (TOTALES)
    async function loadGeneralStats() {
        try {
            const res = await fetch('/api/stats/general');
            const data = await res.json();
            
            // Actualizar textos en pantalla
            lblTotalProyectos.textContent = data.total_proyectos;
            
            // Formato de moneda para la inversión
            lblTotalInversion.textContent = new Intl.NumberFormat('es-CO', { 
                style: 'currency', 
                currency: 'COP', 
                maximumFractionDigits: 0 
            }).format(data.total_inversion);

            lblTotalSedes.textContent = data.total_sedes;
            lblPromedioAvance.textContent = (data.promedio_avance_global || 0).toFixed(1) + '%';
        } catch(error) { 
            console.error("Error cargando estadísticas generales:", error); 
        }
    }

    // 4. LLENAR LOS FILTROS (SELECTS)
    async function loadFilters() {
        try {
            // Cargar Municipios
            const resMun = await fetch('/api/municipios');
            const dataMun = await resMun.json();
            dataMun.forEach(m => filtroMunicipio.add(new Option(m.nombre, m.id)));

            // Cargar Indicadores
            const resInd = await fetch('/api/indicadores');
            const dataInd = await resInd.json();
            dataInd.forEach(i => filtroIndicador.add(new Option(i.nombre, i.id)));
            
            // Nota: Podrías cargar proyectos aquí si no son demasiados
        } catch(error) {
            console.error("Error cargando filtros:", error);
        }
    }

    // 5. ESCUCHAR CAMBIOS EN LOS FILTROS
    filtroMunicipio.addEventListener('change', updateCharts);
    filtroProyecto.addEventListener('change', updateCharts);
    filtroIndicador.addEventListener('change', updateCharts);
    
    // Botón Limpiar
    btnLimpiar.addEventListener('click', () => {
        filtroMunicipio.value = "";
        filtroProyecto.value = "";
        filtroIndicador.value = "";
        updateCharts(); // Recargar gráficas sin filtros
    });

    // 6. FUNCIÓN PRINCIPAL: ACTUALIZAR GRÁFICAS
    async function updateCharts() {
        // Preparamos los parámetros para enviar al servidor
        const params = new URLSearchParams({
            municipio_id: filtroMunicipio.value,
            // proyecto_id: filtroProyecto.value, // Descomentar si implementas filtro por proyecto
            indicador_id: filtroIndicador.value
        });

        try {
            // --- GRÁFICA 1: EVOLUCIÓN (LÍNEA) ---
            const resEvo = await fetch(`/api/stats/evolution?${params}`);
            const dataEvo = await resEvo.json();

            // Preparar datos para Chart.js
            const labels = dataEvo.map(d => d.fecha_seguimiento);
            const values = dataEvo.map(d => d.avance_promedio);

            const ctxEvo = document.getElementById('chartEvolution').getContext('2d');
            
            // Si ya existe una gráfica previa, la destruimos para crear la nueva
            if (evolutionChart) evolutionChart.destroy();

            evolutionChart = new Chart(ctxEvo, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: '% Avance Promedio',
                        data: values,
                        borderColor: '#005f27',       // Color Verde Gobernación
                        backgroundColor: 'rgba(0, 95, 39, 0.1)', // Fondo transparente verde
                        borderWidth: 3,
                        tension: 0.3,                 // Curvatura suave de la línea
                        fill: true,
                        pointRadius: 5,
                        pointHoverRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: { 
                            beginAtZero: true, 
                            max: 100, 
                            title: { display: true, text: '% Porcentaje' } 
                        },
                        x: { 
                            title: { display: true, text: 'Fecha de Seguimiento' } 
                        }
                    },
                    plugins: {
                        tooltip: { 
                            callbacks: { 
                                label: (ctx) => ctx.raw.toFixed(2) + '%' 
                            } 
                        }
                    }
                }
            });

            // --- GRÁFICA 2: DISTRIBUCIÓN (BARRAS) ---
            // (Ejemplo estático por ahora para mostrar funcionalidad "al mismo tiempo")
            
            const ctxDist = document.getElementById('chartDistribution').getContext('2d');
            if (distributionChart) distributionChart.destroy();

            distributionChart = new Chart(ctxDist, {
                type: 'bar',
                data: {
                    labels: ['R.P.', 'S.G.P.', 'MEN', 'S.G.R.'],
                    datasets: [{
                        label: 'Fuentes de Inversión (Simulado)',
                        data: [45, 25, 20, 10], // Valores de ejemplo
                        backgroundColor: [
                            '#e67e22', // Naranja
                            '#2980b9', // Azul
                            '#8e44ad', // Morado
                            '#27ae60'  // Verde
                        ]
                    }]
                },
                options: { 
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        title: { display: true, text: 'Distribución de Recursos (Ejemplo)' }
                    }
                }
            });

        } catch (error) {
            console.error("Error dibujando gráficas:", error);
        }
    }
});