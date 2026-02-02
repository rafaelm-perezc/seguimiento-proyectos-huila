const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const os = require('os');
const xlsx = require('xlsx'); 

// ---------------------------------------------------------
// 1. DETECCIÓN DE ENTORNO
// ---------------------------------------------------------
const isPkg = typeof process.pkg !== 'undefined';
let dbPath;
let dbFolder;

if (isPkg) {
    // --- MODO PRODUCCIÓN (.exe) ---
    // Usamos AppData para persistencia segura
    const userHome = os.homedir();
    if (process.platform === 'win32') {
        dbFolder = path.join(process.env.APPDATA || path.join(userHome, 'AppData', 'Roaming'), 'SeguimientoProyectos');
    } else {
        dbFolder = path.join(userHome, '.SeguimientoProyectos');
    }
    
    // Crear la carpeta si no existe
    if (!fs.existsSync(dbFolder)) {
        fs.mkdirSync(dbFolder, { recursive: true });
    }
    dbPath = path.join(dbFolder, 'proyectos_huila.db');
    console.log("🚀 MODO PRODUCCIÓN DETECTADO. Base de datos en:", dbPath);

} else {
    // --- MODO DESARROLLO ---
    // Carpeta local del proyecto
    dbFolder = __dirname;
    dbPath = path.join(dbFolder, 'proyectos_huila.db');
    console.log("🛠️ MODO DESARROLLO. Base de datos local en:", dbPath);
}

// ---------------------------------------------------------
// 2. CONEXIÓN A LA BASE DE DATOS
// ---------------------------------------------------------
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('❌ Error conectando BD:', err.message);
    else console.log('✅ Conexión exitosa a SQLite.');
});

// ---------------------------------------------------------
// 3. ESTRUCTURA Y CARGA INICIAL
// ---------------------------------------------------------
db.serialize(() => {
    // --- CREACIÓN DE TABLAS ---
    // 1. Proyectos
    db.run(`CREATE TABLE IF NOT EXISTS proyectos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo_bpin TEXT UNIQUE,
        nombre_proyecto TEXT UNIQUE NOT NULL,
        anio_contrato INTEGER NOT NULL,
        contratista TEXT,
        valor_inicial REAL DEFAULT 0,
        valor_rp REAL DEFAULT 0, valor_sgp REAL DEFAULT 0, valor_men REAL DEFAULT 0, valor_sgr REAL DEFAULT 0,
        fuente_recursos TEXT
    )`);

    // 2. Municipios
    db.run(`CREATE TABLE IF NOT EXISTS municipios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT UNIQUE NOT NULL
    )`);

    // 3. Instituciones
    db.run(`CREATE TABLE IF NOT EXISTS instituciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        municipio_id INTEGER,
        FOREIGN KEY(municipio_id) REFERENCES municipios(id),
        UNIQUE(nombre, municipio_id)
    )`);

    // 4. Sedes
    db.run(`CREATE TABLE IF NOT EXISTS sedes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        institucion_id INTEGER,
        FOREIGN KEY(institucion_id) REFERENCES instituciones(id),
        UNIQUE(nombre, institucion_id)
    )`);

    // 5. Indicadores
    db.run(`CREATE TABLE IF NOT EXISTS indicadores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT UNIQUE NOT NULL
    )`);

    // 6. Actividades
    db.run(`CREATE TABLE IF NOT EXISTS actividades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        proyecto_id INTEGER,
        descripcion TEXT NOT NULL,
        FOREIGN KEY(proyecto_id) REFERENCES proyectos(id)
    )`);

    // 7. Seguimientos
    db.run(`CREATE TABLE IF NOT EXISTS seguimientos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        proyecto_id INTEGER,
        actividad_id INTEGER,
        sede_id INTEGER,
        indicador_id INTEGER,
        porcentaje_avance REAL,
        fecha_seguimiento TEXT,
        responsable TEXT,
        observaciones TEXT,
        es_adicion INTEGER DEFAULT 0,
        valor_adicion REAL DEFAULT 0,
        fuente_adicion TEXT, 
        FOREIGN KEY(proyecto_id) REFERENCES proyectos(id),
        FOREIGN KEY(actividad_id) REFERENCES actividades(id),
        FOREIGN KEY(sede_id) REFERENCES sedes(id),
        FOREIGN KEY(indicador_id) REFERENCES indicadores(id)
    )`);

    // --- VERIFICAR SI ESTÁ VACÍA PARA CARGAR DATOS ---
    db.get("SELECT count(*) as count FROM indicadores", (err, row) => {
        if (!err && row.count === 0) {
            console.log("🌱 Base de datos vacía. Iniciando carga automática de catálogos...");
            cargarDatosIniciales();
        } else {
            console.log("✅ Datos existentes detectados. Omitiendo carga inicial.");
        }
    });
});

// ---------------------------------------------------------
// 4. FUNCIÓN DE CARGA MASIVA (SEEDING)
// ---------------------------------------------------------
function cargarDatosIniciales() {
    // Rutas de los archivos (funcionan dentro del .exe gracias a fs.readFileSync)
    const rutaIndicadores = path.join(__dirname, 'indicadores.xlsx');
    const rutaSedes = path.join(__dirname, 'sedes.xlsx');

    // Helper para leer Excel como Buffer (Crucial para PKG)
    const leerExcelComoBuffer = (ruta) => {
        try {
            if (!fs.existsSync(ruta)) {
                console.warn(`⚠️ Archivo no encontrado: ${ruta}`);
                return null;
            }
            const buffer = fs.readFileSync(ruta);
            return xlsx.read(buffer, { type: 'buffer' });
        } catch (error) {
            console.error(`❌ Error leyendo ${ruta}:`, error.message);
            return null;
        }
    };

    // A. CARGA DE INDICADORES
    const wbInd = leerExcelComoBuffer(rutaIndicadores);
    if (wbInd) {
        const sheet = wbInd.Sheets[wbInd.SheetNames[0]];
        const datos = xlsx.utils.sheet_to_json(sheet);
        console.log(`📊 Procesando ${datos.length} indicadores...`);

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            const stmt = db.prepare("INSERT OR IGNORE INTO indicadores (nombre) VALUES (?)");
            
            datos.forEach(fila => {
                // AQUÍ ESTÁ LA CORRECCIÓN: Buscamos explícitamente "INDICADORES" (Plural)
                // y mantenemos opciones de respaldo por seguridad.
                let nombreInd = fila['INDICADORES'] || fila['INDICADOR'] || fila['NOMBRE'] || fila['nombre'];
                
                // Si aún es null, intentar buscar cualquier columna que tenga texto
                if (!nombreInd) {
                    const keys = Object.keys(fila);
                    if (keys.length > 0) nombreInd = fila[keys[0]];
                }

                if (nombreInd) {
                    stmt.run(nombreInd.toString().trim().toUpperCase());
                }
            });
            stmt.finalize();
            db.run("COMMIT", () => console.log("✅ Indicadores cargados correctamente."));
        });
    }

    // B. CARGA DE MUNICIPIOS, INSTITUCIONES Y SEDES
    const wbSedes = leerExcelComoBuffer(rutaSedes);
    if (wbSedes) {
        const sheet = wbSedes.Sheets[wbSedes.SheetNames[0]];
        const datos = xlsx.utils.sheet_to_json(sheet);
        console.log(`🏫 Procesando ${datos.length} registros geográficos...`);

        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            
            // 1. Municipios
            const insertMuni = db.prepare("INSERT OR IGNORE INTO municipios (nombre) VALUES (?)");
            const muniSet = new Set(); // Para evitar duplicados en memoria
            
            datos.forEach(fila => {
                const mun = (fila['MUNICIPIO'] || '').toString().trim().toUpperCase();
                if (mun && !muniSet.has(mun)) {
                    insertMuni.run(mun);
                    muniSet.add(mun);
                }
            });
            insertMuni.finalize();

            // 2. Instituciones y Sedes
            datos.forEach(fila => {
                const mun = (fila['MUNICIPIO'] || '').toString().trim().toUpperCase();
                const inst = (fila['INSTITUCION'] || '').toString().trim().toUpperCase();
                const sede = (fila['SEDE'] || '').toString().trim().toUpperCase();

                if (mun && inst) {
                    // Insertar Institución (vinculada al municipio por nombre)
                    db.run(`INSERT OR IGNORE INTO instituciones (nombre, municipio_id) 
                            SELECT ?, id FROM municipios WHERE nombre = ?`, [inst, mun]);
                    
                    if (sede) {
                        // Insertar Sede (vinculada a institución y municipio)
                        db.run(`INSERT OR IGNORE INTO sedes (nombre, institucion_id) 
                                SELECT ?, id FROM instituciones WHERE nombre = ? 
                                AND municipio_id = (SELECT id FROM municipios WHERE nombre = ?)`, 
                                [sede, inst, mun]);
                    }
                }
            });

            db.run("COMMIT", () => console.log("✅ Catálogo geográfico cargado correctamente."));
        });
    }
}

module.exports = db;