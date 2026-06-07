#!/usr/bin/env node
/**
 * build-app.js — Empaquetador de Producción Inteligente
 * ========================================================
 * Uso:
 *   node dev-tools/build-app.js              → Build normal
 *   node dev-tools/build-app.js --dry-run    → Simula sin escribir nada
 *   node dev-tools/build-app.js --clean      → Borra el build anterior primero
 *   node dev-tools/build-app.js --out=./dist → Carpeta destino personalizada
 *   node dev-tools/build-app.js --help       → Muestra esta ayuda
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── COLORES ANSI (sin dependencias externas) ────────────────────────────────
const c = {
    reset:  '\x1b[0m',
    bold:   '\x1b[1m',
    dim:    '\x1b[2m',
    red:    '\x1b[31m',
    green:  '\x1b[32m',
    yellow: '\x1b[33m',
    cyan:   '\x1b[36m',
    white:  '\x1b[37m',
};
const log = {
    info:    (msg) => console.log(`${c.cyan}  ℹ${c.reset}  ${msg}`),
    success: (msg) => console.log(`${c.green}  ✔${c.reset}  ${msg}`),
    warn:    (msg) => console.log(`${c.yellow}  ⚠${c.reset}  ${msg}`),
    error:   (msg) => console.error(`${c.red}  ✖${c.reset}  ${msg}`),
    skip:    (msg) => console.log(`${c.dim}  ─  ${msg}${c.reset}`),
    title:   (msg) => console.log(`\n${c.bold}${c.white}${msg}${c.reset}`),
    divider: ()    => console.log(`${c.dim}${'─'.repeat(55)}${c.reset}`),
};

// ─── CONSTANTES DE EXCLUSIÓN ─────────────────────────────────────────────────
/** Archivos/carpetas que NUNCA deben llegar a producción */
const EXCLUDED_EXTENSIONS  = ['.stories.js'];
const EXCLUDED_DIRECTORIES = ['.storybook', 'node_modules', 'scratch'];
const EXCLUDED_FILES       = ['assets_db.json'];

// ─── PARSEO DE ARGUMENTOS CLI ────────────────────────────────────────────────
const args = process.argv.slice(2);

if (args.includes('--help')) {
    console.log(`
${c.bold}build-app.js — Empaquetador de Producción${c.reset}

${c.cyan}Uso:${c.reset}
  node dev-tools/build-app.js [opciones]

${c.cyan}Opciones:${c.reset}
  --clean        Borra la carpeta de destino antes de empaquetar
  --dry-run      Simula el proceso sin escribir ningún archivo
  --out=<ruta>   Carpeta raíz donde se generará el build (por defecto: ./build)
  --help         Muestra esta ayuda

${c.cyan}Ejemplo:${c.reset}
  node dev-tools/build-app.js --clean --out=./dist
`);
    process.exit(0);
}

const DRY_RUN  = args.includes('--dry-run');
const DO_CLEAN = args.includes('--clean');
const outArg   = args.find(a => a.startsWith('--out='));
const OUT_ROOT  = outArg ? path.resolve(outArg.split('=')[1]) : path.resolve(__dirname, '../build');

// ─── RUTAS BASE ───────────────────────────────────────────────────────────────
const APP_DIR  = path.resolve(__dirname, '../app');
const INFO_PATH = path.join(APP_DIR, 'info.json');

// ─── ESTADÍSTICAS ─────────────────────────────────────────────────────────────
const stats = { copied: 0, skipped: 0, errors: 0 };

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/** Lee y parsea el info.json. Lanza error si no existe. */
function readConfig() {
    if (!fs.existsSync(INFO_PATH)) {
        log.error(`No se encontró ${INFO_PATH}`);
        process.exit(1);
    }
    return JSON.parse(fs.readFileSync(INFO_PATH, 'utf-8'));
}

/**
 * Extrae TODAS las rutas de imagen usadas en el proyecto.
 * Escanea dos fuentes:
 *   1. info.json — imágenes configurables (logos, fondos, iconos de menú, epps)
 *   2. Archivos JS/CSS — imágenes hardcodeadas en componentes (botones, modales, etc.)
 *      → Excluye archivos .stories.js para no traer imágenes solo de demo.
 */
function extractUsedImages(config, appDir) {
    const used = new Set();
    // Regex que detecta: ./images/algo.ext o images/algo.ext
    const imgRegex = /(?:\.\/)?images\/([^\s"'`,<>]+)/g;

    // ── Fuente 1: info.json ──────────────────────────────────────────────────
    const jsonRaw = JSON.stringify(config);
    let match;
    while ((match = imgRegex.exec(jsonRaw)) !== null) {
        used.add(match[1].toLowerCase());
    }

    // ── Fuente 2: archivos JS y CSS del proyecto ─────────────────────────────
    const scanExtensions = ['.js', '.css'];
    function scanDir(dir) {
        if (!fs.existsSync(dir)) return;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (!EXCLUDED_DIRECTORIES.includes(entry.name)) scanDir(fullPath);
                continue;
            }
            // Ignorar stories — sus referencias son solo para demo, no producción
            if (EXCLUDED_EXTENSIONS.some(ext => entry.name.endsWith(ext))) continue;
            if (!scanExtensions.some(ext => entry.name.endsWith(ext))) continue;

            const content = fs.readFileSync(fullPath, 'utf-8');
            imgRegex.lastIndex = 0; // Reset regex state
            let m;
            while ((m = imgRegex.exec(content)) !== null) {
                // Ignorar template literals como ${btn.img}
                if (m[1].includes('${')) continue;
                used.add(m[1].toLowerCase());
            }

            // Segunda pasada: captura valores de propiedades img/icon que son
            // solo nombres de archivo (sin ruta), ej: img: 'ayuda.png'
            // Este patrón cubre las imágenes usadas dinámicamente con ${btn.img}
            const propRegex = /(?:img|icon|src)\s*:\s*['"]([^'"\/]+\.(?:png|jpg|jpeg|svg|gif|webp))['"]|img\s*=\s*['"]([^'"\/]+\.(?:png|jpg|jpeg|svg|gif|webp))['"]/gi;
            let p;
            while ((p = propRegex.exec(content)) !== null) {
                const name = (p[1] || p[2]).toLowerCase();
                if (name && !name.includes('${')) used.add(name);
            }
        }
    }
    scanDir(path.join(appDir, 'js'));
    scanDir(path.join(appDir, 'css'));

    return used;
}

/**
 * Extrae el nombre del modelo desde la URL del asset Verge3D.
 * "./verge3d_assets/CHINALCO_MOLINO_SAG.html" → "CHINALCO_MOLINO_SAG"
 */
function extractBuildName(verge3dUrl) {
    if (!verge3dUrl) {
        log.error("No se encontró 'verge3dUrl' en info.json. No se puede determinar el nombre del build.");
        process.exit(1);
    }
    return path.basename(verge3dUrl, path.extname(verge3dUrl));
}

/**
 * Copia un archivo de src a dest.
 * En modo --dry-run solo loguea sin escribir.
 */
function copyFile(src, dest) {
    if (DRY_RUN) {
        log.info(`[DRY-RUN] ${path.relative(APP_DIR, src)} → ${path.relative(OUT_ROOT, dest)}`);
        stats.copied++;
        return;
    }
    try {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
        stats.copied++;
    } catch (err) {
        log.error(`Error copiando ${src}: ${err.message}`);
        stats.errors++;
    }
}

/**
 * Copia recursivamente un directorio aplicando filtros.
 * @param {string} srcDir - Origen
 * @param {string} destDir - Destino
 * @param {object} opts
 * @param {Set<string>|null} opts.allowedImages - Si se pasa, filtra la carpeta images
 * @param {boolean} opts.isImagesDir - Indica que estamos dentro de /images
 */
function copyDir(srcDir, destDir, opts = {}) {
    if (!fs.existsSync(srcDir)) {
        log.warn(`Carpeta no encontrada, se omitirá: ${srcDir}`);
        return;
    }

    for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
        const srcPath  = path.join(srcDir, entry.name);
        const destPath = path.join(destDir, entry.name);

        if (entry.isDirectory()) {
            // Excluir carpetas de desarrollo/sistema
            if (EXCLUDED_DIRECTORIES.includes(entry.name)) {
                log.skip(`Omitiendo carpeta: ${entry.name}/`);
                continue;
            }
            copyDir(srcPath, destPath, opts);
            continue;
        }

        // ── Filtros de archivo ────────────────────────────────────────────────

        // 1. Archivos de sistema
        if (EXCLUDED_FILES.includes(entry.name)) {
            log.skip(`Omitiendo archivo de sistema: ${entry.name}`);
            stats.skipped++;
            continue;
        }

        // 2. Stories de Storybook
        if (EXCLUDED_EXTENSIONS.some(ext => entry.name.endsWith(ext))) {
            log.skip(`Omitiendo story: ${entry.name}`);
            stats.skipped++;
            continue;
        }

        // 3. Filtro de imágenes no utilizadas
        if (opts.isImagesDir && opts.allowedImages) {
            if (!opts.allowedImages.has(entry.name.toLowerCase())) {
                log.skip(`Imagen no usada, omitida: images/${entry.name}`);
                stats.skipped++;
                continue;
            }
        }

        copyFile(srcPath, destPath);
    }
}

// ─── EJECUCIÓN PRINCIPAL ──────────────────────────────────────────────────────

function main() {
    console.log(`\n${c.bold}${c.cyan}╔══════════════════════════════════════════════╗${c.reset}`);
    console.log(`${c.bold}${c.cyan}║       🚀  Lab Builder — Producción          ║${c.reset}`);
    console.log(`${c.bold}${c.cyan}╚══════════════════════════════════════════════╝${c.reset}`);

    if (DRY_RUN) {
        console.log(`\n${c.yellow}${c.bold}  MODO DRY-RUN — No se escribirá ningún archivo${c.reset}`);
    }

    // ── Paso 1: Leer configuración ───────────────────────────────────────────
    log.title('Paso 1/5 · Leyendo configuración...');
    const config  = readConfig();
    const buildName = extractBuildName(config.verge3dUrl);
    const OUT_DIR   = path.join(OUT_ROOT, buildName);
    log.success(`Nombre del build: ${c.bold}${buildName}${c.reset}`);
    log.success(`Destino:          ${c.bold}${OUT_DIR}${c.reset}`);

    // ── Paso 2: Limpiar build anterior ──────────────────────────────────────
    log.title('Paso 2/5 · Limpieza previa...');
    if (DO_CLEAN && fs.existsSync(OUT_DIR)) {
        if (!DRY_RUN) {
            fs.rmSync(OUT_DIR, { recursive: true, force: true });
            log.success(`Carpeta limpiada: ${OUT_DIR}`);
        } else {
            log.info(`[DRY-RUN] Se limpiaría: ${OUT_DIR}`);
        }
    } else if (!DO_CLEAN && fs.existsSync(OUT_DIR)) {
        log.warn(`El destino ya existe. Usa --clean para limpiarlo antes.`);
    } else {
        log.info('Sin carpeta previa, no hay nada que limpiar.');
    }

    // ── Paso 3: Detectar imágenes activas ───────────────────────────────────
    log.title('Paso 3/5 · Analizando recursos activos...');
    const usedImages = extractUsedImages(config, APP_DIR);
    if (usedImages.size === 0) {
        log.warn('No se detectaron imágenes en info.json. Se copiarán todas por seguridad.');
    } else {
        log.success(`Imágenes activas encontradas: ${c.bold}${usedImages.size}${c.reset}`);
        for (const img of [...usedImages].sort()) {
            log.info(`  → images/${img}`);
        }
    }
    log.divider();

    // ── Paso 4: Copiar archivos ──────────────────────────────────────────────
    log.title('Paso 4/5 · Copiando archivos...');

    // index.html
    copyFile(path.join(APP_DIR, 'index.html'), path.join(OUT_DIR, 'index.html'));
    log.success('index.html copiado.');

    // info.json
    copyFile(path.join(APP_DIR, 'info.json'), path.join(OUT_DIR, 'info.json'));
    log.success('info.json copiado.');

    // css/ — sin filtros especiales
    log.info('Copiando css/...');
    copyDir(path.join(APP_DIR, 'css'), path.join(OUT_DIR, 'css'));

    // js/ — excluye .stories.js automáticamente
    log.info('Copiando js/ (excluyendo .stories.js)...');
    copyDir(path.join(APP_DIR, 'js'), path.join(OUT_DIR, 'js'));

    // sounds/ — completo
    log.info('Copiando sounds/...');
    copyDir(path.join(APP_DIR, 'sounds'), path.join(OUT_DIR, 'sounds'));

    // audios/ — nuevo: completo
    log.info('Copiando audios/...');
    copyDir(path.join(APP_DIR, 'audios'), path.join(OUT_DIR, 'audios'));

    // images/ — solo las referenciadas
    log.info('Copiando images/ (filtrada)...');
    copyDir(
        path.join(APP_DIR, 'images'),
        path.join(OUT_DIR, 'images'),
        { isImagesDir: true, allowedImages: usedImages.size > 0 ? usedImages : null }
    );

    // verge3d_assets/ — COMPLETO, sin filtros
    log.info('Copiando verge3d_assets/ (completo)...');
    copyDir(path.join(APP_DIR, 'verge3d_assets'), path.join(OUT_DIR, 'verge3d_assets'));

    // ── Paso 5: Reporte final ────────────────────────────────────────────────
    log.title('Paso 5/5 · Reporte final');
    log.divider();
    console.log(`  ${c.green}Archivos copiados: ${c.bold}${stats.copied}${c.reset}`);
    console.log(`  ${c.yellow}Archivos omitidos: ${c.bold}${stats.skipped}${c.reset}`);
    if (stats.errors > 0) {
        console.log(`  ${c.red}Errores:           ${c.bold}${stats.errors}${c.reset}`);
    }
    log.divider();

    if (stats.errors > 0) {
        log.error('Build completado con errores. Revisa el log.');
        process.exit(1);
    }

    if (DRY_RUN) {
        console.log(`\n${c.yellow}  DRY-RUN completado. Sin errores detectados.${c.reset}`);
        console.log(`${c.dim}  Corre sin --dry-run para generar el build real.${c.reset}\n`);
    } else {
        console.log(`\n${c.green}${c.bold}  ✅ Build generado exitosamente en:${c.reset}`);
        console.log(`  ${c.cyan}${OUT_DIR}${c.reset}\n`);
    }
}

main();
