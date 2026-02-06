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

    getProjectLocations: (proyectoId) => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT
                    sed.id as sede_id,
                    sed.nombre as sede_nombre,
                    inst.id as institucion_id,
                    inst.nombre as institucion_nombre,
                    mun.id as municipio_id,
                    mun.nombre as municipio_nombre,
                    seg.porcentaje_avance as ultimo_avance,
                    seg.fecha_seguimiento as ultima_fecha
                FROM seguimientos seg
                JOIN (
                    SELECT sede_id, MAX(id) as max_id
                    FROM seguimientos
                    WHERE proyecto_id = ?
                    GROUP BY sede_id
                ) latest ON seg.id = latest.max_id
                JOIN sedes sed ON seg.sede_id = sed.id
                JOIN instituciones inst ON sed.institucion_id = inst.id
                JOIN municipios mun ON inst.municipio_id = mun.id
                ORDER BY mun.nombre, inst.nombre, sed.nombre
            `;
            db.all(sql, [proyectoId], (err, rows) => (err ? reject(err) : resolve(rows)));
        });
    },

    // Obtener sedes por actividad (último seguimiento por sede)
    getLocationsByActivity: (actividadId) => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT
                    sed.id as sede_id,
                    sed.nombre as sede_nombre,
                    inst.id as institucion_id,
                    inst.nombre as institucion_nombre,
                    mun.id as municipio_id,
                    mun.nombre as municipio_nombre,
                    seg.porcentaje_avance as ultimo_avance,
                    seg.fecha_seguimiento as ultima_fecha
                FROM seguimientos seg
                JOIN (
                    SELECT sede_id, MAX(id) as max_id
                    FROM seguimientos
                    WHERE actividad_id = ?
                    GROUP BY sede_id
                ) latest ON seg.id = latest.max_id
                JOIN sedes sed ON seg.sede_id = sed.id
                JOIN instituciones inst ON sed.institucion_id = inst.id
                JOIN municipios mun ON inst.municipio_id = mun.id
                ORDER BY mun.nombre, inst.nombre, sed.nombre
            `;
            db.all(sql, [actividadId], (err, rows) => (err ? reject(err) : resolve(rows)));
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

    // 1. Totales para tarjetas de resumen (con filtros opcionales)
    getGeneralStats: (filters = {}) => {
        return new Promise((resolve, reject) => {
            const whereClauses = [];
            const params = [];

            if (filters.indicador_id) { whereClauses.push('s.indicador_id = ?'); params.push(filters.indicador_id); }
            if (filters.proyecto_id) { whereClauses.push('s.proyecto_id = ?'); params.push(filters.proyecto_id); }
            if (filters.actividad_id) { whereClauses.push('s.actividad_id = ?'); params.push(filters.actividad_id); }
            if (filters.municipio_id) { whereClauses.push('m.id = ?'); params.push(filters.municipio_id); }
            if (filters.institucion_id) { whereClauses.push('inst.id = ?'); params.push(filters.institucion_id); }
            if (filters.sede_id) { whereClauses.push('s.sede_id = ?'); params.push(filters.sede_id); }

            const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

            const sql = `
                WITH seguimientos_filtrados AS (
                    SELECT s.*
                    FROM seguimientos s
                    LEFT JOIN sedes sed ON s.sede_id = sed.id
                    LEFT JOIN instituciones inst ON sed.institucion_id = inst.id
                    LEFT JOIN municipios m ON inst.municipio_id = m.id
                    ${whereSql}
                )
                SELECT
                    (SELECT COUNT(DISTINCT proyecto_id) FROM seguimientos_filtrados) as total_proyectos,
                    (SELECT COALESCE(SUM(p.valor_inicial), 0) FROM proyectos p WHERE p.id IN (SELECT DISTINCT proyecto_id FROM seguimientos_filtrados)) as total_inversion,
                    (SELECT COUNT(DISTINCT sede_id) FROM seguimientos_filtrados WHERE sede_id IS NOT NULL) as total_sedes,
                    (SELECT COALESCE(AVG(porcentaje_avance), 0) FROM seguimientos_filtrados) as promedio_avance_global
            `;

            db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row || {
                total_proyectos: 0,
                total_inversion: 0,
                total_sedes: 0,
                promedio_avance_global: 0
            })));
        });
    },

    getProjectsByIndicador: (indicadorId) => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT DISTINCT p.id, p.nombre_proyecto as nombre
                FROM seguimientos s
                JOIN proyectos p ON s.proyecto_id = p.id
                WHERE s.indicador_id = ?
                ORDER BY p.nombre_proyecto
            `;
            db.all(sql, [indicadorId], (err, rows) => (err ? reject(err) : resolve(rows)));
        });
    },

    getActivitiesByIndicatorProject: (indicadorId, proyectoId) => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT DISTINCT a.id, a.descripcion as nombre
                FROM seguimientos s
                JOIN actividades a ON s.actividad_id = a.id
                WHERE s.indicador_id = ? AND s.proyecto_id = ?
                ORDER BY a.descripcion
            `;
            db.all(sql, [indicadorId, proyectoId], (err, rows) => (err ? reject(err) : resolve(rows)));
        });
    },

    getMunicipiosByFilters: (filters) => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT DISTINCT m.id, m.nombre
                FROM seguimientos s
                JOIN sedes sed ON s.sede_id = sed.id
                JOIN instituciones inst ON sed.institucion_id = inst.id
                JOIN municipios m ON inst.municipio_id = m.id
                WHERE s.indicador_id = ? AND s.proyecto_id = ? AND s.actividad_id = ?
                ORDER BY m.nombre
            `;
            db.all(sql, [filters.indicador_id, filters.proyecto_id, filters.actividad_id], (err, rows) => (err ? reject(err) : resolve(rows)));
        });
    },

    getInstitucionesByFilters: (filters) => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT DISTINCT inst.id, inst.nombre
                FROM seguimientos s
                JOIN sedes sed ON s.sede_id = sed.id
                JOIN instituciones inst ON sed.institucion_id = inst.id
                JOIN municipios m ON inst.municipio_id = m.id
                WHERE s.indicador_id = ? AND s.proyecto_id = ? AND s.actividad_id = ? AND m.id = ?
                ORDER BY inst.nombre
            `;
            db.all(sql, [filters.indicador_id, filters.proyecto_id, filters.actividad_id, filters.municipio_id], (err, rows) => (err ? reject(err) : resolve(rows)));
        });
    },

    getSedesByFilters: (filters) => {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT DISTINCT sed.id, sed.nombre
                FROM seguimientos s
                JOIN sedes sed ON s.sede_id = sed.id
                JOIN instituciones inst ON sed.institucion_id = inst.id
                WHERE s.indicador_id = ? AND s.proyecto_id = ? AND s.actividad_id = ? AND inst.id = ?
                ORDER BY sed.nombre
            `;
            db.all(sql, [filters.indicador_id, filters.proyecto_id, filters.actividad_id, filters.institucion_id], (err, rows) => (err ? reject(err) : resolve(rows)));
        });
    },

    // 2. Evolución temporal (Gráfica de Línea)
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
            if (filters.indicador_id) { sql += " AND s.indicador_id = ?"; params.push(filters.indicador_id); }
            if (filters.proyecto_id) { sql += " AND s.proyecto_id = ?"; params.push(filters.proyecto_id); }
            if (filters.actividad_id) { sql += " AND s.actividad_id = ?"; params.push(filters.actividad_id); }
            if (filters.municipio_id) { sql += " AND m.id = ?"; params.push(filters.municipio_id); }
            if (filters.institucion_id) { sql += " AND inst.id = ?"; params.push(filters.institucion_id); }
            if (filters.sede_id) { sql += " AND s.sede_id = ?"; params.push(filters.sede_id); }

            sql = sql.replace('AVG(s.porcentaje_avance) as avance_promedio', `AVG(s.porcentaje_avance) as avance_promedio,
                    GROUP_CONCAT(DISTINCT CASE
                        WHEN s.observaciones IS NOT NULL AND TRIM(s.observaciones) <> ''
                        THEN TRIM(s.observaciones)
                    END) as comentarios`);

            // Agrupar por fecha y ordenar
            sql += ` GROUP BY s.fecha_seguimiento 
                     ORDER BY substr(s.fecha_seguimiento, 7, 4) || '-' || substr(s.fecha_seguimiento, 4, 2) || '-' || substr(s.fecha_seguimiento, 1, 2) ASC`;

            db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
        });
    }

};

module.exports = ProjectModel;