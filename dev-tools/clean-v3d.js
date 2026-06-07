const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '../app/verge3d_assets');
const JS_FILE = path.join(ASSETS_DIR, 'v3d.js');

function cleanHTML() {
    const files = fs.readdirSync(ASSETS_DIR);
    const htmlFile = files.find(f => f.endsWith('.html'));
    if (!htmlFile) return;

    const filePath = path.join(ASSETS_DIR, htmlFile);
    let content = fs.readFileSync(filePath, 'utf8');

    content = content.replace(/<title>Verge3D[^<]*<\/title>/gi, '<title>Laboratorio 3D</title>');
    content = content.replace(/<meta[^>]*Verge3D[^>]*>/gi, '');
    content = content.replace(/<div id="fullscreen-button"[^>]*><\/div>/gi, '');
    content = content.replace(/Verge3D/gi, '3D');

    fs.writeFileSync(filePath, content);
    console.log('HTML cleaned.');
}

function cleanJS() {
    if (!fs.existsSync(JS_FILE)) return;
    let content = fs.readFileSync(JS_FILE, 'utf8');

    if (!content.includes('MADE WITH VERGE3D')) {
        console.log('v3d.js: banner not found (already clean).');
        return;
    }

    let patched = false;

    // Strategy 1: two-pass full-block replacement.
    // How the DRM works: banner div is appended to the app container; after 1s, if the div
    // is still in the DOM AND its textContent hashes to the expected value, dispose() is NOT
    // called. If the div is removed OR the text is altered (hash mismatch), dispose() runs.
    // Fix: set innerHTML="" so textContent="" → hash never matches → dispose() not called.
    const divMatch = content.match(/([a-zA-Z0-9_$]+)\.innerHTML\s*=\s*`[^`]*MADE WITH VERGE3D[^`]*`/);
    if (divMatch) {
        const origDiv = divMatch[1];
        const esc = origDiv.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const blockRE = new RegExp(
            esc + '\\.innerHTML\\s*=\\s*`[^`]*`' +
            '\\s*,\\s*([a-zA-Z0-9_$]+)\\.appendChild\\(' + esc + '\\)' +
            '\\s*,\\s*setTimeout\\s*\\(function\\s*\\(\\)\\s*\\{' +
            '[^}]*([a-zA-Z0-9_$]+)\\.dispose\\(\\)[^}]*\\}\\s*,1e3\\)'
        );
        const bm = content.match(blockRE);
        if (bm) {
            const [, parent, app] = bm;
            content = content.replace(blockRE,
                `${origDiv}.innerHTML="",${parent}.appendChild(${origDiv}),` +
                `setTimeout(function(){!${parent}.contains(${origDiv})&&${app}.dispose()},1e3)`
            );
            patched = true;
            console.log('v3d.js cleaned (strategy 1: full block).');
        }
    }

    // Strategy 2: neutralize the DRM setTimeout entirely.
    // Matches: setTimeout(function(){A.contains(B)&&HASH==fn(B.textContent)||C.dispose()},1e3)
    if (!patched) {
        const drmTimer = /setTimeout\s*\(function\s*\(\)\s*\{[^}]*\.contains\([^)]*\)\s*&&[^}]*\.dispose\s*\(\)[^}]*\}\s*,1e3\)/;
        if (drmTimer.test(content)) {
            content = content.replace(drmTimer, 'setTimeout(function(){},1e3)');
            patched = true;
            console.log('v3d.js cleaned (strategy 2: DRM timer neutralized).');
        }
    }

    // Strategy 3: last resort — clear innerHTML so textContent hash check always fails.
    if (!patched) {
        const bannerInner = /([a-zA-Z0-9_$]+)\.innerHTML\s*=\s*`[^`]*MADE WITH VERGE3D[^`]*`/;
        if (bannerInner.test(content)) {
            content = content.replace(bannerInner, (_, v) => `${v}.innerHTML=""`);
            patched = true;
            console.log('v3d.js cleaned (strategy 3: innerHTML cleared).');
        }
    }

    if (!patched) {
        console.warn('WARNING: MADE WITH VERGE3D found but no strategy matched. Inspect v3d.js manually.');
        return;
    }

    fs.writeFileSync(JS_FILE, content);
}

function activateXZ() {
    const files = fs.readdirSync(ASSETS_DIR);
    
    // Buscamos el archivo JS de la aplicación (el que tiene la extensión .gltf)
    const appJS = files.find(f => {
        if (!f.endsWith('.js') || f === 'v3d.js' || f.includes('visual_logic') || f.includes('.wasm')) return false;
        const content = fs.readFileSync(path.join(ASSETS_DIR, f), 'utf8');
        return content.includes('.gltf');
    });

    if (!appJS) return;

    const filePath = path.join(ASSETS_DIR, appJS);
    let content = fs.readFileSync(filePath, 'utf8');

    // Aplicamos lo que dice la imagen: cambiar .gltf por .gltf.xz
    if (content.includes('.gltf') && !content.includes('.gltf.xz')) {
        content = content.replace(/\.gltf/g, '.gltf.xz');
        fs.writeFileSync(filePath, content);
        console.log(`[OPTIMIZED] ${appJS}: Scene URL changed to .gltf.xz`);
    }
}

cleanHTML();
cleanJS();
activateXZ();
