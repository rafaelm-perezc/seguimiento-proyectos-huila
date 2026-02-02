const db = require('../db/database');

const ProjectModel = {
    
    // Buscar proyecto por BPIN exacto
    findByBpin: (bpin) => {
        return new Promise((resolve, reject) => {
            if (!bpin) return resolve(null); 
            const sql = `SELECT * FROM proyectos WHERE codigo_bpin = ?`;
            db.get(sql, [bpin], (err, row) => (err ? reject(err) : resolve(row)));
        });
    },

    // Buscador general (BPIN o Nombre)
    search: (query) => {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM proyectos 
                         WHERE codigo_bpin LIKE ? OR nombre_proyecto LIKE ? 
                         LIMIT 10`;
            const param = `%${query}%`;
            db.all(sql, [param, param], (err, rows) => (err ? reject(err) : resolve(rows)));
        });
    },

    // CREAR PROYECTO 
    createProject: (data) => {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO proyectos 
                (codigo_bpin, nombre_proyecto, anio_contrato, contratista, valor_inicial, valor_rp, valor_sgp, valor_men, valor_sgr, fuente_recursos) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            
            // Lógica BPIN Opcional: Convertir vacío a NULL
            let bpinFinal = null;
            if (data.codigo_bpin && data.codigo_bpin.toString().trim() !== "") {
                bpinFinal = data.codigo_bpin.toString().trim();
            }

            const params = [
                bpinFinal, 
                data.nombre_proyecto.toUpperCase(), 
                data.anio_contrato, 
                data.contratista ? data.contratista.toUpperCase() : null, 
                data.valor_inicial, 
                data.valor_rp || 0,
                data.valor_sgp || 0,
                data.valor_men || 0,
                data.valor_sgr || 0, 
                data.fuente_recursos ? data.fuente_recursos.toUpperCase() : null
            ];

            db.run(sql, params, function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    },

    // Gestión de Actividades
    addActivity: (proyectoId, descripcion) => {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO actividades (proyecto_id, descripcion) VALUES (?, ?)`;
            db.run(sql, [proyectoId, descripcion.toUpperCase()], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    },

    getActivitiesByProject: (proyectoId) => {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM actividades WHERE proyecto_id = ?`;
            db.all(sql, [proyectoId], (err, rows) => (err ? reject(err) : resolve(rows)));
        });
    },

    // Obtener último seguimiento para autocompletar ubicación
    getLastTrackingByActivity: (actividadId) => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    s.actividad_id, s.sede_id, s.indicador_id, s.responsable, s.observaciones,
                    sed.institucion_id, inst.municipio_id
                FROM seguimientos s
                LEFT JOIN sedes sed ON s.sede_id = sed.id
                LEFT JOIN instituciones inst ON sed.institucion_id = inst.id
                WHERE s.actividad_id = ?
                ORDER BY s.id DESC
                LIMIT 1
            `;
            db.get(sql, [actividadId], (err, row) => (err ? reject(err) : resolve(row)));
        });
    },

    // Creación de catálogos (Ubicación)
    createMunicipio: (nombre) => {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO municipios (nombre) VALUES (?)`;
            db.run(sql, [nombre.toUpperCase()], function(err) { if (err) reject(err); else resolve(this.lastID); });
        });
    },
    createInstitucion: (nombre, municipioId) => {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO instituciones (nombre, municipio_id) VALUES (?, ?)`;
            db.run(sql, [nombre.toUpperCase(), municipioId], function(err) { if (err) reject(err); else resolve(this.lastID); });
        });
    },
    createSede: (nombre, institucionId) => {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO sedes (nombre, institucion_id) VALUES (?, ?)`;
            db.run(sql, [nombre.toUpperCase(), institucionId], function(err) { if (err) reject(err); else resolve(this.lastID); });
        });
    },

    // Guardar Seguimiento
    addSeguimiento: (data) => {
        return new Promise((resolve, reject) => {
            const sql = `INSERT INTO seguimientos 
                (proyecto_id, actividad_id, sede_id, indicador_id, porcentaje_avance, fecha_seguimiento, responsable, observaciones, es_adicion, valor_adicion, fuente_adicion)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            const params = [
                data.proyecto_id, data.actividad_id, data.sede_id, data.indicador_id,
                data.porcentaje_avance, data.fecha_seguimiento, 
                data.responsable.toUpperCase(), 
                data.observaciones ? data.observaciones.toUpperCase() : '',
                data.es_adicion ? 1 : 0,
                data.valor_adicion || 0, 
                data.fuente_adicion ? data.fuente_adicion.toUpperCase() : null
            ];
            db.run(sql, params, function(err) { if (err) reject(err); else resolve(this.lastID); });
        });
    },

    // Helpers de listados
    getAllMunicipios: () => { return new Promise((resolve, reject) => { db.all("SELECT * FROM municipios ORDER BY nombre", [], (err, rows) => (err ? reject(err) : resolve(rows))); }); },
    getInstitucionesByMunicipio: (munId) => { return new Promise((resolve, reject) => { db.all("SELECT * FROM instituciones WHERE municipio_id = ? ORDER BY nombre", [munId], (err, rows) => (err ? reject(err) : resolve(rows))); }); },
    getSedesByInstitucion: (instId) => { return new Promise((resolve, reject) => { db.all("SELECT * FROM sedes WHERE institucion_id = ? ORDER BY nombre", [instId], (err, rows) => (err ? reject(err) : resolve(rows))); }); },
    getAllIndicadores: () => { return new Promise((resolve, reject) => { db.all("SELECT * FROM indicadores ORDER BY nombre", [], (err, rows) => (err ? reject(err) : resolve(rows))); }); },

    // Exportar todo
    getAllDataForExport: () => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    p.codigo_bpin, i.nombre as indicador, p.anio_contrato, p.nombre_proyecto, 
                    a.descripcion as actividad, p.contratista, 
                    m.nombre as municipio, inst.nombre as institucion, s.nombre as sede,
                    p.valor_inicial, p.valor_rp, p.valor_sgp, p.valor_men, p.valor_sgr,
                    seg.valor_adicion, seg.fuente_adicion, seg.porcentaje_avance, 
                    seg.fecha_seguimiento, seg.responsable, seg.observaciones
                FROM seguimientos seg
                JOIN proyectos p ON seg.proyecto_id = p.id
                JOIN actividades a ON seg.actividad_id = a.id
                LEFT JOIN sedes s ON seg.sede_id = s.id
                LEFT JOIN instituciones inst ON s.institucion_id = inst.id
                LEFT JOIN municipios m ON inst.municipio_id = m.id
                LEFT JOIN indicadores i ON seg.indicador_id = i.id
                ORDER BY seg.id DESC
            `;
            db.all(sql, [], (err, rows) => (err ? reject(err) : resolve(rows)));
        });
    },

    // -------------------------------------------------------------
    //   ⬇️ AQUÍ EMPIEZA EL CÓDIGO NUEVO PARA LAS GRÁFICAS ⬇️
    // -------------------------------------------------------------

    // 1. Totales Generales (Para tarjetas de resumen)
    getGeneralStats: () => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT 
                    (SELECT COUNT(*) FROM proyectos) as total_proyectos,
                    (SELECT SUM(valor_inicial) FROM proyectos) as total_inversion,
                    (SELECT COUNT(*) FROM sedes) as total_sedes,
                    (SELECT AVG(porcentaje_avance) FROM seguimientos) as promedio_avance_global
            `;
            db.get(sql, [], (err, row) => (err ? reject(err) : resolve(row)));
        });
    },

    // 2. Evolución temporal (Gráfica de Línea)
    // Recibe un objeto 'filters' con los IDs para filtrar la consulta
    getEvolutionData: (filters) => {
        return new Promise((resolve, reject) => {
            let sql = `
                SELECT 
                    s.fecha_seguimiento, 
                    AVG(s.porcentaje_avance) as avance_promedio
                FROM seguimientos s
                JOIN proyectos p ON s.proyecto_id = p.id
                LEFT JOIN sedes sed ON s.sede_id = sed.id
                LEFT JOIN instituciones inst ON sed.institucion_id = inst.id
                LEFT JOIN municipios m ON inst.municipio_id = m.id
                WHERE 1=1
            `;
            
            const params = [];

            // Aplicar filtros si existen
            if (filters.proyecto_id) { sql += " AND s.proyecto_id = ?"; params.push(filters.proyecto_id); }
            if (filters.municipio_id) { sql += " AND m.id = ?"; params.push(filters.municipio_id); }
            if (filters.sede_id) { sql += " AND s.sede_id = ?"; params.push(filters.sede_id); }
            if (filters.indicador_id) { sql += " AND s.indicador_id = ?"; params.push(filters.indicador_id); }

            // Agrupar por fecha y ordenar
            // Truco: Ordenar fechas tipo texto DD/MM/YYYY correctamente para que la gráfica salga en orden
            sql += ` GROUP BY s.fecha_seguimiento 
                     ORDER BY substr(s.fecha_seguimiento, 7, 4) || '-' || substr(s.fecha_seguimiento, 4, 2) || '-' || substr(s.fecha_seguimiento, 1, 2) ASC`;

            db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
        });
    }

};

module.exports = ProjectModel;