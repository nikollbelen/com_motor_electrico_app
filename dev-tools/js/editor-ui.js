import { DataEngine } from './DataEngine.js';
import { Autocomplete } from './Autocomplete.js';

let rawConfig = null;
let treeData = null;
let selectedNode = null;
let currentTags = { initOcultar: [], cristalExcluir: [], stepOcultar: [], stepResaltar: [] };
let sceneAssets = { meshes: [], anims: [] }; // <-- Lista de objetos reales del 3D

async function fetchAssets() {
    try {
        const resp = await fetch('http://localhost:3001/assets');
        if (resp.ok) sceneAssets = await resp.json();
        console.log("[Editor] Base de datos de activos cargada:", sceneAssets);
    } catch(e) { console.warn("No se pudo conectar con el servidor de activos."); }
}

const width = window.innerWidth;
const height = window.innerHeight - 60;
const zoomBehavior = d3.zoom().on("zoom", (event) => g.attr("transform", event.transform));
const svg = d3.select("#chart").append("svg").attr("width", width).attr("height", height).call(zoomBehavior);
const g = svg.append("g").attr("transform", "translate(100,0)");
const tree = d3.tree().size([height, width - 200]);

async function init(data) {
    if (data) rawConfig = data;
    else {
        try {
            const response = await fetch('../app/info.json');
            if (response.ok) rawConfig = await response.json();
        } catch (e) { console.warn("Sin info.json"); }
    }
    if (rawConfig) { treeData = DataEngine.normalize(rawConfig); update(); }
    await fetchAssets();
    
    // Configurar listeners para validación en tiempo real de campos de malla únicos
    ['inpInitCam', 'inpInitDir', 'inpPosicion', 'inpDireccion', 'inpEtiquetaObj', 'inpFlechaObj'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => window.validateMeshInput(el));
            new Autocomplete(el, sceneAssets.meshes);
        }
    });

    // Configurar autocompletado para etiquetas (Tags)
    new Autocomplete(document.getElementById('inpInitOcultar'), sceneAssets.meshes, () => window.addTagFromInput('inpInitOcultar', 'tags-init-ocultar'));
    new Autocomplete(document.getElementById('inpCristalExcluir'), sceneAssets.meshes, () => window.addTagFromInput('inpCristalExcluir', 'tags-cristal-excluir'));
    new Autocomplete(document.getElementById('inpOcultarTxt'), sceneAssets.meshes, () => window.addTagFromInput('inpOcultarTxt', 'tags-ocultar'));
    new Autocomplete(document.getElementById('inpResaltarTxt'), sceneAssets.meshes, () => window.addTagFromInput('inpResaltarTxt', 'tags-resaltar'));
}

function update() {
    if (!treeData) return;
    const root = d3.hierarchy(treeData, d => d.children);
    tree(root);
    const links = g.selectAll(".link").data(root.links(), d => d.target.data.id || d.target.data.name);
    links.exit().remove();
    links.enter().append("path").attr("class", "link");
    g.selectAll(".link").transition().duration(500).attr("d", d3.linkHorizontal().x(d => d.y).y(d => d.x));
    const nodes = g.selectAll(".node").data(root.descendants(), d => d.data.id || d.data.name);
    nodes.exit().remove();
    const nodeEnter = nodes.enter().append("g").attr("class", "node");
    nodeEnter.append("circle").attr("r", 8).style("fill", d => d.data._children ? "lightsteelblue" : "#fff")
        .on("click", (event, d) => {
            event.stopPropagation();
            if (d.data.children) { d.data._children = d.data.children; d.data.children = null; }
            else if (d.data._children) { d.data.children = d.data._children; d.data._children = null; }
            update();
        });
    nodeEnter.append("text").attr("dy", ".35em").attr("x", d => (d.children || d.data._children) ? -15 : 15)
        .style("text-anchor", d => (d.children || d.data._children) ? "end" : "start")
        .text(d => d.data.name).on("click", (event, d) => { event.stopPropagation(); window.openModal(d.data); });
    const nodeUpdate = nodeEnter.merge(nodes);
    nodeUpdate.transition().duration(500).attr("transform", d => `translate(${d.y},${d.x})`);
    nodeUpdate.select("circle").style("fill", d => d.data._children ? "lightsteelblue" : "#fff");
    nodeUpdate.select("text").text(d => d.data.name);
}

function updatePreview(inputId, previewContainerId) {
    const url = document.getElementById(inputId).value;
    const container = document.getElementById(previewContainerId);
    if (!container) return;
    const img = container.querySelector('img');
    if (url && (url.includes('/') || url.includes('.'))) {
        img.src = url.startsWith('http') ? url : `../app/${url}`;
        container.style.display = 'block';
        img.onerror = () => container.style.display = 'none';
    } else {
        container.style.display = 'none';
    }
}

window.renderTags = function (containerId, tagsArray) {
    const container = document.getElementById(containerId);
    container.innerHTML = tagsArray.map((tag, i) => {
        // Validar si el tag existe en las mallas de la escena
        const isInvalid = sceneAssets.meshes.length > 0 && !sceneAssets.meshes.includes(tag);
        
        if (isInvalid) console.warn(`[Editor] ⚠️ El objeto "${tag}" no existe en la escena 3D.`);
        
        const chipClass = isInvalid ? 'tag-chip invalid-asset' : 'tag-chip';
        const help = isInvalid ? 'title="Este objeto no existe en el modelado 3D"' : '';
        
        return `<div class="${chipClass}" ${help}>${tag}<span class="tag-chip-del" onclick="removeTag('${containerId}', ${i})">x</span></div>`;
    }).join('');
};

window.addTagFromInput = function (inputId, containerId) {
    const input = document.getElementById(inputId);
    const value = input.value.trim();
    if (!value) return;

    // Log de validación en tiempo real para el usuario
    console.log(`[Editor] Validando Asset (Mesh): "${value}"`);
    if (sceneAssets.meshes.length > 0) {
        if (sceneAssets.meshes.includes(value)) {
            console.log(`[Editor] ✅ Mesh encontrado en el modelado: "${value}"`);
        } else {
            console.error(`[Editor] ❌ Mesh NO encontrado: "${value}". Se marcará en rojo.`);
        }
    } else {
        console.warn("[Editor] Base de datos de meshes vacía. Abre el laboratorio 3D para sincronizar.");
    }

    let targetArray = getTargetArray(containerId);
    if (!targetArray.includes(value)) { targetArray.push(value); window.renderTags(containerId, targetArray); }
    input.value = '';
};

window.removeTag = function (containerId, index) {
    let targetArray = getTargetArray(containerId);
    targetArray.splice(index, 1);
    window.renderTags(containerId, targetArray);
};

function getTargetArray(containerId) {
    if (containerId === 'tags-init-ocultar') return currentTags.initOcultar;
    if (containerId === 'tags-cristal-excluir') return currentTags.cristalExcluir;
    if (containerId === 'tags-ocultar') return currentTags.stepOcultar;
    if (containerId === 'tags-resaltar') return currentTags.stepResaltar;
    return [];
}

window.addRow = function (type, data = {}) {
    const containerId = (type === 'objetivo') ? 'list-objetivos' : (type === 'epp') ? 'list-epp' : '';
    if (!containerId) return;
    const container = document.getElementById(containerId);
    const rowId = `row-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const row = document.createElement('div');
    row.className = (type === 'objetivo') ? 'row-objetivo' : 'row-epp';
    row.id = rowId;
    if (type === 'objetivo') {
        row.innerHTML = `<div class="form-group"><label>ESP Descrip.</label><input type="text" class="obj-es" value="${data.ESdescription || ''}"></div><div class="form-group"><label>ENG Descrip.</label><input type="text" class="obj-en" value="${data.ENdescription || ''}"></div><button type="button" class="btn-del-mini" onclick="document.getElementById('${rowId}').remove()">x</button>`;
    } else {
        row.innerHTML = `<div class="form-group"><label>ESP Nombre</label><input type="text" class="epp-es" value="${data.ESdescription || ''}"></div><div class="form-group"><label>ENG Nombre</label><input type="text" class="epp-en" value="${data.ENdescription || ''}"></div><div class="form-group"><label>Imagen URL</label><input type="text" class="epp-img" value="${data.imagenUrl || ''}"></div><button type="button" class="btn-del-mini" onclick="document.getElementById('${rowId}').remove()">x</button>`;
    }
    container.appendChild(row);
};

window.addAnimRow = function (type, data = {}) {
    const containerId = type === 'root' ? 'root-anim-list' : 'step-anim-list';
    const container = document.getElementById(containerId);
    const rowId = `anim-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const row = document.createElement('div');
    row.className = 'anim-row'; row.id = rowId;
    const isRange = Array.isArray(data.frame || data.frames);
    const fStart = isRange ? (data.frame?.[0] ?? data.frames?.[0] ?? 0) : (data.frame ?? data.frames ?? 0);
    const fEnd = isRange ? (data.frame?.[1] ?? data.frames?.[1] ?? 0) : '';
    const modo = data.modo || 'LoopOnce';

    row.innerHTML = `
        <div class="form-group"><label>Nombre</label><input type="text" class="anim-name ${validateAnim(data.nombre)}" value="${data.nombre || ''}" oninput="validateAnimInput(this)"></div>
        <div class="form-group">
            <label>Tipo</label>
            <select class="anim-type" onchange="toggleAnimRowType('${rowId}')">
                <option value="single" ${!isRange ? 'selected' : ''}>Frame</option>
                <option value="range" ${isRange ? 'selected' : ''}>Rango</option>
            </select>
        </div>
        <div class="form-group"><label class="lbl-start">${isRange ? 'Inicio' : 'Frame'}</label><input type="number" class="anim-start" value="${fStart}"></div>
        <div class="form-group anim-end-group" style="${isRange ? '' : 'display:none'}"><label>Fin</label><input type="number" class="anim-end" value="${fEnd}"></div>
        <div class="form-group">
            <label>Modo</label>
            <select class="anim-modo">
                <option value="LoopOnce" ${modo === 'LoopOnce' ? 'selected' : ''}>Una vez</option>
                <option value="LoopRepeat" ${modo === 'LoopRepeat' ? 'selected' : ''}>Loop</option>
            </select>
        </div>
        <button type="button" class="btn-del-mini" onclick="document.getElementById('${rowId}').remove()">x</button>
    `;
    container.appendChild(row);

    const inputName = row.querySelector('.anim-name');
    if (inputName) {
        new Autocomplete(inputName, sceneAssets.anims, () => window.validateAnimInput(inputName));
    }
};

window.validateAnimInput = function(input) {
    const name = input.value.trim();
    console.log(`[Editor] Validando animación: "${name}"`);
    
    if (sceneAssets.anims.length > 0) {
        if (!sceneAssets.anims.includes(name)) {
            console.error(`[Editor] ❌ Animación NO encontrada: "${name}"`);
            input.classList.add('invalid-asset');
            input.title = "Esta animación no existe en el modelado 3D";
        } else {
            console.log(`[Editor] ✅ Animación encontrada: "${name}"`);
            input.classList.remove('invalid-asset');
            input.title = "";
        }
    } else {
        console.warn("[Editor] Base de datos de animaciones vacía. Sincroniza el 3D.");
    }
};

window.validateMeshInput = function(input) {
    const value = input.value.trim();
    if (!value) {
        input.classList.remove('invalid-asset');
        return;
    }

    // Si es una coordenada manual [x,y,z], es válida por definición en el editor
    if (value.startsWith('[') && value.includes(']')) {
        input.classList.remove('invalid-asset');
        input.title = "Coordenada manual detectada";
        return;
    }
    
    if (sceneAssets.meshes.length > 0) {
        if (!sceneAssets.meshes.includes(value)) {
            console.warn(`[Editor] ⚠️ Mesh no encontrado en el modelado 3D: "${value}"`);
            input.classList.add('invalid-asset');
            input.title = "Este objeto no existe en el modelado 3D";
        } else {
            input.classList.remove('invalid-asset');
            input.title = "";
        }
    }
};

function validateAnim(name) {
    if (!name || sceneAssets.anims.length === 0) return '';
    return sceneAssets.anims.includes(name) ? '' : 'invalid-asset';
}

window.toggleAnimRowType = function (rowId) {
    const row = document.getElementById(rowId);
    const isRange = row.querySelector('.anim-type').value === 'range';
    row.querySelector('.anim-end-group').style.display = isRange ? 'block' : 'none';
    row.querySelector('.lbl-start').textContent = isRange ? 'Inicio' : 'Frame';
};

function getAnimationsFromUI(containerId) {
    const container = document.getElementById(containerId);
    const rows = container.querySelectorAll('.anim-row');
    const anims = [];
    rows.forEach(row => {
        const nombre = row.querySelector('.anim-name').value;
        const type = row.querySelector('.anim-type').value;
        const start = parseInt(row.querySelector('.anim-start').value) || 0;
        const end = parseInt(row.querySelector('.anim-end').value);
        const modo = row.querySelector('.anim-modo').value;
        if (nombre) {
            anims.push({
                nombre,
                frame: type === 'range' ? [start, isNaN(end) ? start : end] : start,
                modo
            });
        }
    });
    return anims;
}

window.toggleHelpVisibility = function () {
    const hasObj = document.getElementById('inpObjetivos').checked;
    const hasEpp = document.getElementById('inpEquipo').checked;
    document.getElementById('section-objetivos').style.display = hasObj ? 'block' : 'none';
    document.getElementById('section-epp').style.display = hasEpp ? 'block' : 'none';
};

window.toggleEtiquetaSection = function () {
    const active = document.getElementById('chkEsEtiqueta').checked;
    document.getElementById('section-etiqueta').style.display = active ? 'grid' : 'none';
};

window.openModal = function (nodeData) {
    selectedNode = nodeData;
    const rootFields = document.getElementById('root-fields');
    const stepFields = document.getElementById('step-fields');
    document.getElementById('root-anim-list').innerHTML = '';
    document.getElementById('step-anim-list').innerHTML = '';
    document.getElementById('list-objetivos').innerHTML = '';
    document.getElementById('list-epp').innerHTML = '';

    if (nodeData.isRoot) {
        rootFields.style.display = 'block'; stepFields.style.display = 'none';
        document.getElementById('inpLabName').value = nodeData.name || '';
        document.getElementById('inpLabNameEN').value = nodeData.nameEN || '';
        document.getElementById('inpZoomMaxOut').value = nodeData.camaraZoomMax ?? 15000;
        // Mapear themeColor a la paleta correcta
        const PALETTE_MAP = {
            '#0066ff': 'blue-core',
            '#00d4ff': 'cyan-plasma',
            '#8b5cf6': 'violet-forge',
            '#f59e0b': 'amber-fusion',
            '#10b981': 'emerald-core'
        };
        const savedColor = (nodeData.themeColor || '#0066ff').toLowerCase();
        const paletteName = PALETTE_MAP[savedColor] || 'blue-core';
        const radio = document.querySelector(`input[name="palette"][value="${paletteName}"]`);
        if (radio) radio.checked = true;
        document.getElementById('inpThemeColor').value = savedColor;

        // Listener: cuando cambie la paleta, actualizar el hidden input
        document.querySelectorAll('input[name="palette"]').forEach(r => {
            r.onchange = () => {
                const REVERSE_MAP = {
                    'blue-core': '#0066ff', 'cyan-plasma': '#00d4ff', 'violet-forge': '#8b5cf6',
                    'amber-fusion': '#f59e0b', 'emerald-core': '#10b981'
                };
                document.getElementById('inpThemeColor').value = REVERSE_MAP[r.value] || '#0066ff';
            };
        });

        const ini = nodeData.inicioEstado || {};
        if (ini.animacionInicio) {
            const anims = Array.isArray(ini.animacionInicio) ? ini.animacionInicio : [ini.animacionInicio];
            anims.forEach(a => window.addAnimRow('root', a));
        }
        currentTags.initOcultar = [...(ini.ocultarObjetos || [])];
        window.renderTags('tags-init-ocultar', currentTags.initOcultar);
        currentTags.cristalExcluir = [...(nodeData.objetos_cristal || [])];
        window.renderTags('tags-cristal-excluir', currentTags.cristalExcluir);
        document.getElementById('inpInitCam').value = ini.camara || '';
        document.getElementById('inpInitDir').value = ini.camaraDireccion || '';
        const ayud = nodeData.ayudas || {};
        document.getElementById('inpAyuda').checked = ayud.tieneBotonAyuda !== false;
        document.getElementById('inpObjetivos').checked = ayud.tieneBotonObjetivos !== false;
        document.getElementById('inpEquipo').checked = ayud.tieneBotonEquipo !== false;
        document.getElementById('inpSonido').checked = ayud.tieneBotonSonido !== false;
        document.getElementById('inpLang').checked = ayud.tieneBotonLang !== false;
        document.getElementById('inpGuardar').checked = ayud.tieneBotonGuardar !== false;
        if (nodeData.objetivos) nodeData.objetivos.forEach(o => window.addRow('objetivo', o));
        if (nodeData.epp) nodeData.epp.forEach(e => window.addRow('epp', e));
        document.getElementById('inpObjetivos').onchange = window.toggleHelpVisibility;
        document.getElementById('inpEquipo').onchange = window.toggleHelpVisibility;
        window.toggleHelpVisibility();
    } else {
        rootFields.style.display = 'none'; stepFields.style.display = 'block';
        document.getElementById('inpNombre').value = nodeData.ESdescription || '';
        document.getElementById('inpNombreEN').value = nodeData.ENdescription || '';
        const inpId = document.getElementById('inpEtiqueta');
        inpId.value = nodeData.id || '';
        inpId.disabled = true; // Bloquear ID en sub-pasos
        inpId.title = "El ID se genera automáticamente basado en la posición";
        
        document.getElementById('inpPosicion').value = nodeData.camara || '';
        document.getElementById('inpDireccion').value = nodeData.camaraDireccion || '';

        const hasEtiqueta = !!(nodeData.etiqueta || nodeData.flecha);
        document.getElementById('chkEsEtiqueta').checked = hasEtiqueta;
        document.getElementById('inpEtiquetaObj').value = nodeData.etiqueta || '';
        document.getElementById('inpFlechaObj').value = nodeData.flecha || '';
        
        // Cargar nuevos campos de texto para la etiqueta
        document.getElementById('inpSubtitleES').value = nodeData.subtitle || '';
        document.getElementById('inpSubtitleEN').value = nodeData.subtitleEN || '';
        document.getElementById('inpTagES').value = nodeData.status || '';
        document.getElementById('inpTagEN').value = nodeData.statusEN || '';

        window.toggleEtiquetaSection();

        if (nodeData.animaciones && Array.isArray(nodeData.animaciones)) nodeData.animaciones.forEach(a => window.addAnimRow('step', a));
        currentTags.stepOcultar = [...(nodeData.objetos_ocultar || [])];
        currentTags.stepResaltar = [...(nodeData.objeto_resaltar || [])];
        window.renderTags('tags-ocultar', currentTags.stepOcultar);
        window.renderTags('tags-resaltar', currentTags.stepResaltar);
        document.getElementById('inpStopAnim').checked = nodeData.detener_animaciones || false;

        // Cargar datos de TTS basados en ID (Numérico como desea el usuario)
        const audioId = nodeData.id.replace('paso', '');
        const audioPath = `audios/${audioId}.mp3`;
        document.getElementById('inpAudioPath').value = audioPath;
        document.getElementById('tts-status').innerText = '';
    }

    // Inicializar modos de cámara (Detectar si es coordenada o nombre de objeto)
    const initCamValue = nodeData.isRoot ? (nodeData.inicioEstado?.camara || '') : (nodeData.camara || '');
    const isRawMode = initCamValue.startsWith('[');
    if (nodeData.isRoot) {
        document.getElementById('selInitCamMode').value = isRawMode ? 'coords' : 'names';
        window.toggleCamInputs('root');
    } else {
        document.getElementById('selStepCamMode').value = isRawMode ? 'coords' : 'names';
        window.toggleCamInputs('step');
    }

    // Ejecutar validación inicial de todos los campos de malla
    ['inpInitCam', 'inpInitDir', 'inpPosicion', 'inpDireccion', 'inpEtiquetaObj', 'inpFlechaObj'].forEach(id => {
        const el = document.getElementById(id);
        if (el) window.validateMeshInput(el);
    });

    renderChildrenList(); document.getElementById('editModalOverlay').style.display = 'flex';
};

window.saveNodeChanges = async function () {
    if (!selectedNode) return;
    if (selectedNode.isRoot) {
        selectedNode.name = document.getElementById('inpLabName').value;
        selectedNode.nameEN = document.getElementById('inpLabNameEN').value;
        selectedNode.themeColor = document.getElementById('inpThemeColor').value;
        selectedNode.inicioEstado = selectedNode.inicioEstado || {};
        selectedNode.inicioEstado.camara = document.getElementById('inpInitCam').value;
        selectedNode.inicioEstado.camaraDireccion = document.getElementById('inpInitDir').value;
        selectedNode.inicioEstado.ocultarObjetos = currentTags.initOcultar;
        selectedNode.camaraZoomMax = parseFloat(document.getElementById('inpZoomMaxOut').value) || 15000;
        selectedNode.objetos_cristal = currentTags.cristalExcluir;
        const animRoot = getAnimationsFromUI('root-anim-list');
        selectedNode.inicioEstado.animacionInicio = animRoot.length > 1 ? animRoot : (animRoot[0] || null);
        selectedNode.ayudas = {
            tieneBotonAyuda: document.getElementById('inpAyuda').checked, tieneBotonObjetivos: document.getElementById('inpObjetivos').checked,
            tieneBotonEquipo: document.getElementById('inpEquipo').checked, tieneBotonSonido: document.getElementById('inpSonido').checked, tieneBotonLang: document.getElementById('inpLang').checked,
            tieneBotonGuardar: document.getElementById('inpGuardar').checked
        };
        if (selectedNode.ayudas.tieneBotonObjetivos) selectedNode.objetivos = Array.from(document.querySelectorAll('#list-objetivos .row-objetivo')).map(row => ({ ESdescription: row.querySelector('.obj-es').value, ENdescription: row.querySelector('.obj-en').value }));
        else delete selectedNode.objetivos;
        if (selectedNode.ayudas.tieneBotonEquipo) selectedNode.epp = Array.from(document.querySelectorAll('#list-epp .row-epp')).map(row => ({ ESdescription: row.querySelector('.epp-es').value, ENdescription: row.querySelector('.epp-en').value, imagenUrl: row.querySelector('.epp-img').value }));
        else delete selectedNode.epp;
    } else {
        selectedNode.ESdescription = document.getElementById('inpNombre').value; selectedNode.name = selectedNode.ESdescription;
        selectedNode.ENdescription = document.getElementById('inpNombreEN').value;
        selectedNode.id = document.getElementById('inpEtiqueta').value;
        selectedNode.camara = document.getElementById('inpPosicion').value; selectedNode.camaraDireccion = document.getElementById('inpDireccion').value;

        if (document.getElementById('chkEsEtiqueta').checked) {
            selectedNode.etiqueta = document.getElementById('inpEtiquetaObj').value;
            selectedNode.flecha = document.getElementById('inpFlechaObj').value;
            
            // Guardar nuevos campos de texto
            selectedNode.subtitle = document.getElementById('inpSubtitleES').value;
            selectedNode.subtitleEN = document.getElementById('inpSubtitleEN').value;
            selectedNode.status = document.getElementById('inpTagES').value;
            selectedNode.statusEN = document.getElementById('inpTagEN').value;
        } else {
            delete selectedNode.etiqueta; 
            delete selectedNode.flecha;
            delete selectedNode.subtitle;
            delete selectedNode.subtitleEN;
            delete selectedNode.status;
            delete selectedNode.statusEN;
        }

        const animStep = getAnimationsFromUI('step-anim-list');
        selectedNode.animaciones = animStep;
        selectedNode.objetos_ocultar = currentTags.stepOcultar;
        selectedNode.objeto_resaltar = currentTags.stepResaltar;
        selectedNode.detener_animaciones = document.getElementById('inpStopAnim').checked;
        
        // El audio_path se deduce del ID, no es necesario guardarlo como campo extra si es fijo
        selectedNode.audio_path = document.getElementById('inpAudioPath').value;
    }
    update(); window.closeModal();
    const finalConfig = DataEngine.reconstruct(treeData, rawConfig);
    try {
        await fetch('http://localhost:3001/save', { method: 'POST', body: JSON.stringify(finalConfig, null, 2), headers: { 'Content-Type': 'application/json' } });
        console.log("Disco actualizado.");
    } catch (e) { console.error("Error al guardar."); }
};


function renderChildrenList() {
    const container = document.getElementById('childrenListContainer');
    const nodesChildren = selectedNode.children || selectedNode._children || [];
    if (!nodesChildren.length) { container.innerHTML = '<div class="children-empty" style="padding:20px; color:#999; text-align:center;">Sin sub-pasos</div>'; return; }

    container.innerHTML = nodesChildren.map((c, i) => `
        <div class="child-item-edit" draggable="true" ondragstart="handleDragStart(event, ${i})" ondragover="handleDragOver(event)" ondrop="handleDrop(event, ${i})">
            <div class="drag-handle">≡</div>
            <div class="child-index-info">${c.id}</div>
            <div class="child-inputs">
                <input type="text" value="${c.ESdescription || c.name || ''}" placeholder="ESP" oninput="updateChildData(${i}, 'ESdescription', this.value)">
                <input type="text" value="${c.ENdescription || ''}" placeholder="ENG" oninput="updateChildData(${i}, 'ENdescription', this.value)">
                ${selectedNode.isRoot ? `<input type="text" value="${c.icon || ''}" placeholder="ICON" oninput="updateChildData(${i}, 'icon', this.value)">` : ''}
            </div>
            <button class="btn-delete-child" onclick="deleteChild(${i})" title="Eliminar sub-paso">×</button>
        </div>
    `).join('');
}

let draggedIdx = null;
window.handleDragStart = function(e, index) {
    draggedIdx = index;
    e.dataTransfer.effectAllowed = 'move';
};
window.handleDragOver = function(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
window.handleDrop = function(e, targetIndex) {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIndex) return;
    
    const list = selectedNode.children || selectedNode._children || [];
    
    // Antes de mover, nos aseguramos que todos los hijos tengan su originalId
    list.forEach(item => {
        if (!item.originalId) item.originalId = item.id;
    });

    const item = list.splice(draggedIdx, 1)[0];
    list.splice(targetIndex, 0, item);
    
    recalculateIds(selectedNode);
    renderChildrenList();
    update();
    draggedIdx = null;
};

function recalculateIds(parent) {
    const list = parent.children || parent._children || [];
    list.forEach((child, i) => {
        const num = i + 1;
        // Si el padre es root -> paso1, paso2...
        // Si el padre es un paso -> paso1_1, paso1_2...
        const prefix = parent.isRoot ? 'paso' : (parent.id + '_');
        child.id = prefix + (parent.isRoot ? num : num);
        
        // Recursivo: Actualizar los hijos de este hijo si existen
        if (child.children || child._children) {
            recalculateIds(child);
        }
    });
}
window.updateChildData = function (index, field, value) {
    const nodesChildren = selectedNode.children || selectedNode._children || [];
    if (nodesChildren[index]) { nodesChildren[index][field] = value; if (field === 'ESdescription') nodesChildren[index].name = value; update(); }
};
window.addNewChild = function () {
    if (!selectedNode) return;
    const list = selectedNode.children || selectedNode._children || [];
    const num = list.length + 1;
    const prefix = selectedNode.isRoot ? 'paso' : (selectedNode.id + '_');
    const newId = prefix + num;

    const newChild = { 
        id: newId, 
        ESdescription: "Nuevo Paso " + num, 
        ENdescription: "New Step " + num, 
        name: "Nuevo Paso " + num, 
        icon: "./images/icon2.png", 
        children: [],
        animaciones: [],
        objetos_mostrar: [],
        objetos_ocultar: []
    };
    
    if (!selectedNode.children && !selectedNode._children) selectedNode.children = [newChild];
    else (selectedNode.children || selectedNode._children).push(newChild);
    
    renderChildrenList(); 
    update();
};

window.deleteChild = async (index) => { 
    const confirmed = await window.showConfirm("Eliminar Paso", "¿Estás seguro de que deseas eliminar este paso y todos sus sub-pasos?");
    if(!confirmed) return;
    const list = (selectedNode.children || selectedNode._children);
    list.splice(index, 1); 
    recalculateIds(selectedNode);
    renderChildrenList(); 
    update(); 
};
window.closeModal = () => document.getElementById('editModalOverlay').style.display = 'none';
document.getElementById('uploadBtn').onclick = () => document.getElementById('jsonFileInput').click();
document.getElementById('jsonFileInput').onchange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader(); reader.onload = (event) => init(JSON.parse(event.target.result)); reader.readAsText(file);
};
document.getElementById('btn-export').onclick = () => {
    const finalConfig = DataEngine.reconstruct(treeData, rawConfig);
    const blob = new Blob([JSON.stringify(finalConfig, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'info.json'; a.click();
};
document.getElementById('btn-reset').onclick = () => d3.select("svg").transition().duration(750).call(zoomBehavior.transform, d3.zoomIdentity.translate(100, 0).scale(1));
document.getElementById('btn-fit').onclick = () => {
    const bounds = g.node().getBBox();
    const scale = 0.8 / Math.max(bounds.width / width, bounds.height / height);
    const translate = [width / 2 - scale * (bounds.x + bounds.width / 2), height / 2 - scale * (bounds.y + bounds.height / 2)];
    d3.select("svg").transition().duration(750).call(zoomBehavior.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
};

// --- FUNCIONES TTS (ElevenLabs / Puter AI) ---

/** Lee el proveedor seleccionado en el dropdown del editor */
function getSelectedTTSProvider() {
    const sel = document.getElementById('selTTSProvider');
    return sel ? sel.value : 'elevenlabs';
}

/**
 * @param {'es'|'en'|null} onlyLang — si se pasa, genera solo ese idioma. null = genera ambos.
 */
window.confirmAndRegenerateTTS = async function(onlyLang = null) {
    if (!selectedNode) return;

    const textES = document.getElementById('inpNombre').value.trim();
    const textEN = document.getElementById('inpNombreEN').value.trim();
    const provider = getSelectedTTSProvider();

    // Subtítulos (solo aplican si es nodo etiqueta)
    const isEtiqueta   = document.getElementById('chkEsEtiqueta').checked;
    const subtitleES   = isEtiqueta ? document.getElementById('inpSubtitleES').value.trim() : '';
    const subtitleEN   = isEtiqueta ? document.getElementById('inpSubtitleEN').value.trim() : '';

    // Determinar qué idiomas procesar.
    // Si se pide un idioma específico, ese campo debe tener texto.
    // Si se pide "ambos" (null), se generan los que tengan texto (al menos uno).
    const langs = [];
    if (onlyLang === 'es') {
        if (!textES) { alert("El campo de español está vacío."); return; }
        langs.push('es');
    } else if (onlyLang === 'en') {
        if (!textEN) { alert("El campo de inglés está vacío."); return; }
        langs.push('en');
    } else {
        // Generar ambos: incluir solo los que tengan texto
        if (textES) langs.push('es');
        if (textEN) langs.push('en');
        if (langs.length === 0) { alert("Ambos campos de locución están vacíos."); return; }
    }

    // Buscar pasos duplicados para clonar audio automáticamente
    const dupES = [], dupEN = [];
    (function searchDuplicates(nodes) {
        for (const node of nodes) {
            if (node.id === selectedNode.id) { if (node.children) searchDuplicates(node.children); continue; }
            if (langs.includes('es') && node.ESdescription?.trim() === textES) dupES.push(node.id);
            if (langs.includes('en') && node.ENdescription?.trim() === textEN) dupEN.push(node.id);
            if (node.children) searchDuplicates(node.children);
        }
    })(treeData.children || []);

    const providerLabel = provider === 'puter' ? 'Puter AI (Gemini)' : 'ElevenLabs';
    let msg = `Motor: <b>${providerLabel}</b><br><br>`;
    if (langs.includes('es')) msg += `🇪🇸 <b>"${textES}"</b>${dupES.length ? ` → clona en: [${dupES.map(i=>i.replace('paso','')).join(', ')}]` : ''}<br>`;
    if (langs.includes('en')) msg += `🇬🇧 <b>"${textEN}"</b>${dupEN.length ? ` → clona en: [${dupEN.map(i=>i.replace('paso','')).join(', ')}]` : ''}<br>`;
    msg += `<br>Se reemplazarán los audios existentes. ¿Continuar?`;

    const title = langs.length === 2 ? 'Generar ES + EN' : `Generar ${langs[0].toUpperCase()}`;
    const confirmed = await window.showConfirm(title, msg);
    if (!confirmed) return;

    const fileName = selectedNode.id.replace('paso', '');
    const statusEl = document.getElementById('tts-status');
    const results = { ok: [], fail: [] };

    if (provider === 'puter') {
        // ── PUTER: generar todos los blobs en memoria PRIMERO, guardar todo de una sola vez ──
        // Así el live-reload que dispara el primer archivo guardado no cancela el segundo audio.
        const batch = [];

        for (const lang of langs) {
            const text     = lang === 'es' ? textES : textEN;
            const subtitle = lang === 'es' ? subtitleES : subtitleEN;
            const flag     = lang === 'es' ? '🇪🇸' : '🇬🇧';
            const hasSub   = !!subtitle;
            statusEl.style.color = "#64748b";
            statusEl.innerText = `${flag} Generando ${lang.toUpperCase()}${hasSub ? ' (título + subtítulo)' : ''} en memoria...`;
            console.log(`[TTS] Puter — generando ${lang.toUpperCase()}: "${text}"${hasSub ? ` + subtítulo: "${subtitle}"` : ''}`);
            try {
                const audioBase64 = hasSub
                    ? await _generateCombinedAudioBase64(text, subtitle, lang)
                    : await _puterToBase64(text, lang);
                const extras = (lang === 'es' ? dupES : dupEN).map(id => id.replace('paso', ''));
                batch.push({ lang, fileName, audioBase64, extraFileNames: extras });
                console.log(`[TTS] ✅ blob ${lang.toUpperCase()} listo en memoria.`);
            } catch (e) {
                console.error(`[TTS] ❌ Error Puter ${lang.toUpperCase()}:`, e);
                results.fail.push(`${lang.toUpperCase()}: ${e.message}`);
            }
            // Pequeña pausa entre llamadas a Puter (cuando no hay subtítulo — si hay, la pausa ya está dentro)
            if (!hasSub && langs.indexOf(lang) < langs.length - 1) {
                await new Promise(r => setTimeout(r, 400));
            }
        }

        // Guardar todos en una sola petición batch (el live-reload solo dispara una vez)
        if (batch.length > 0) {
            statusEl.innerText = `💾 Guardando ${batch.length} archivo(s)...`;
            try {
                const resp = await fetch('http://localhost:3001/save-audios-batch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ audios: batch })
                });
                const result = await resp.json();
                if (result.status !== 'success') throw new Error(result.message);
                results.ok.push(...batch.map(b => b.lang.toUpperCase()));
                console.log(`[TTS] ✅ Batch guardado:`, result.saved);
            } catch (e) {
                console.error('[TTS] ❌ Error al guardar batch:', e);
                results.fail.push(...batch.map(b => `${b.lang.toUpperCase()}: error al guardar`));
            }
        }

    } else {
        // ── ELEVENLABS: el servidor genera y guarda — flujo secuencial ──
        for (const lang of langs) {
            const title    = lang === 'es' ? textES : textEN;
            const subtitle = lang === 'es' ? subtitleES : subtitleEN;
            // ElevenLabs: combinar título y subtítulo en un solo texto con pausa natural
            const text     = subtitle ? `${title}. ${subtitle}` : title;
            const extras   = (lang === 'es' ? dupES : dupEN).map(id => id.replace('paso', ''));
            const flag     = lang === 'es' ? '🇪🇸' : '🇬🇧';
            statusEl.style.color = "#64748b";
            statusEl.innerText = `${flag} Generando ${lang.toUpperCase()} con ElevenLabs${subtitle ? ' (título + subtítulo)' : ''}...`;
            try {
                await _generateTTSWithElevenLabs(text, lang, fileName, extras);
                results.ok.push(lang.toUpperCase());
            } catch (e) {
                console.error(`[TTS ElevenLabs ${lang}]`, e);
                results.fail.push(`${lang.toUpperCase()}: ${e.message}`);
            }
        }
    }

    // ── Mensaje final ──
    if (results.fail.length === 0) {
        statusEl.innerText = `✅ Generado: ${results.ok.join(' + ')}`;
        statusEl.style.color = "#16a34a";
    } else if (results.ok.length > 0) {
        statusEl.innerText = `⚠️ Parcial: OK ${results.ok.join(', ')} | Error: ${results.fail.join(', ')}`;
        statusEl.style.color = "#d97706";
        alert(`⚠️ Generación parcial:\n✅ ${results.ok.join(', ')}\n❌ ${results.fail.join('\n')}`);
    } else {
        statusEl.innerText = `❌ ${results.fail.join(' | ')}`;
        statusEl.style.color = "#dc2626";
        alert(`❌ Error al generar:\n${results.fail.join('\n')}`);
    }
};

async function _generateTTSWithElevenLabs(text, lang, fileName, extraFileNames) {
    const resp = await fetch('http://localhost:3001/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang, fileName, extraFileNames })
    });
    const result = await resp.json();
    if (result.status !== 'success') throw new Error(result.message || 'Error en el servidor.');
}

async function _generateTTSWithPuter(text, lang, fileName, extraFileNames) {
    if (!window.puter || typeof window.puter.ai?.txt2speech !== 'function') {
        throw new Error('puter.js no está disponible. Recarga la página.');
    }

    const response = await window.puter.ai.txt2speech(text, {
        provider: 'openai',
        model: 'gpt-4o-mini-tts',
        voice: 'alloy',
        response_format: 'mp3'
    });

    // Normalizar respuesta a Blob
    let blob = null;
    if (response instanceof Blob) {
        blob = response;
    } else if (response instanceof HTMLAudioElement) {
        const r = await fetch(response.src); blob = await r.blob();
    } else if (response && (response.src || response.url)) {
        const r = await fetch(response.src || response.url); blob = await r.blob();
    }
    if (!blob) throw new Error('Puter AI no devolvió un audio válido.');

    const audioBase64 = await _blobToBase64(blob);
    const resp = await fetch('http://localhost:3001/save-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang, fileName, audioBase64, extraFileNames })
    });
    const result = await resp.json();
    if (result.status !== 'success') throw new Error(result.message || 'Error al guardar en el servidor.');
}

function _blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]); // quitar "data:...;base64,"
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * Para etiquetas con subtítulo: genera título + 1 segundo de silencio + subtítulo
 * usando Web Audio API (OfflineAudioContext). Devuelve base64 de un archivo WAV.
 */
async function _generateCombinedAudioBase64(titleText, subtitleText, lang) {
    const titleBase64    = await _puterToBase64(titleText, lang);
    await new Promise(r => setTimeout(r, 400)); // pausa entre llamadas a Puter
    const subtitleBase64 = await _puterToBase64(subtitleText, lang);

    // Decodificar ambos a AudioBuffer
    const decode = async (b64) => {
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        // slice(0) para garantizar buffer detached en Safari
        const buffer = await ctx.decodeAudioData(bytes.buffer.slice(0));
        ctx.close();
        return buffer;
    };

    const [titleBuf, subtitleBuf] = await Promise.all([decode(titleBase64), decode(subtitleBase64)]);
    const sampleRate   = titleBuf.sampleRate;
    const numChannels  = Math.max(titleBuf.numberOfChannels, subtitleBuf.numberOfChannels);
    const silenceSamples = sampleRate; // exactamente 1 segundo

    const offlineCtx = new OfflineAudioContext(
        numChannels,
        titleBuf.length + silenceSamples + subtitleBuf.length,
        sampleRate
    );

    const addSource = (buf, startSec) => {
        const src = offlineCtx.createBufferSource();
        src.buffer = buf;
        src.connect(offlineCtx.destination);
        src.start(startSec);
    };
    addSource(titleBuf, 0);
    addSource(subtitleBuf, (titleBuf.length + silenceSamples) / sampleRate);

    const rendered = await offlineCtx.startRendering();
    return _blobToBase64(_audioBufferToWavBlob(rendered));
}

/** Codifica un AudioBuffer como WAV de 16 bits — sin dependencias externas. */
function _audioBufferToWavBlob(buffer) {
    const numCh    = buffer.numberOfChannels;
    const numSamples = buffer.length;
    const sr       = buffer.sampleRate;
    const bps      = 2; // bytes per sample (16-bit PCM)
    const blockAlign = numCh * bps;
    const dataSize = numSamples * blockAlign;
    const ab = new ArrayBuffer(44 + dataSize);
    const v  = new DataView(ab);
    const ws = (off, str) => { for (let i = 0; i < str.length; i++) v.setUint8(off + i, str.charCodeAt(i)); };

    ws(0, 'RIFF'); v.setUint32(4, 36 + dataSize, true);
    ws(8, 'WAVE'); ws(12, 'fmt ');
    v.setUint32(16, 16, true);   // chunk size
    v.setUint16(20, 1, true);    // PCM
    v.setUint16(22, numCh, true);
    v.setUint32(24, sr, true);
    v.setUint32(28, sr * blockAlign, true);
    v.setUint16(32, blockAlign, true);
    v.setUint16(34, 16, true);   // bits per sample
    ws(36, 'data'); v.setUint32(40, dataSize, true);

    let off = 44;
    for (let i = 0; i < numSamples; i++) {
        for (let ch = 0; ch < numCh; ch++) {
            const s = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
            v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            off += 2;
        }
    }
    return new Blob([ab], { type: 'audio/wav' });
}

/** Genera un blob de Puter y lo devuelve como base64 — sin guardar en servidor. */
async function _puterToBase64(text, lang) {
    if (!window.puter || typeof window.puter.ai?.txt2speech !== 'function') {
        throw new Error('puter.js no está disponible. Recarga la página.');
    }
    const response = await window.puter.ai.txt2speech(text, {
        provider: 'openai',
        model: 'gpt-4o-mini-tts',
        voice: 'alloy',
        response_format: 'mp3'
    });
    let blob = null;
    if (response instanceof Blob) {
        blob = response;
    } else if (response instanceof HTMLAudioElement) {
        const r = await fetch(response.src); blob = await r.blob();
    } else if (response && (response.src || response.url)) {
        const r = await fetch(response.src || response.url); blob = await r.blob();
    }
    if (!blob) throw new Error('Puter AI no devolvió un audio válido.');
    return _blobToBase64(blob);
}

window.playCurrentTTS = function(lang = 'es') {
    if (!selectedNode) return;
    const numericId = selectedNode.id.replace('paso', '');
    const audioPath = `audios/${lang}/${numericId}.mp3`;
    const fullUrl = `../app/${audioPath}?t=${Date.now()}`;
    console.log("[Editor] Reproduciendo audio:", fullUrl);
    const audio = new Audio(fullUrl);
    audio.play().catch(() => {
        alert(`No se encontró el audio ${lang.toUpperCase()} para este paso.\nUsa "🎤 Generar ES + EN" para crearlo.`);
    });
};

// --- HELPER: MODAL DE CONFIRMACIÓN CUSTOM ---
window.showConfirm = function(title, message) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('confirmModalOverlay');
        const titleEl = document.getElementById('confirmTitle');
        const messageEl = document.getElementById('confirmMessage');
        const btnOk = document.getElementById('btnConfirmOk');
        const btnCancel = document.getElementById('btnConfirmCancel');

        titleEl.innerText = title;
        messageEl.innerHTML = message; // Usamos HTML para poder poner negritas/rojo
        overlay.style.display = 'flex';

        btnOk.onclick = () => {
            overlay.style.display = 'none';
            resolve(true);
        };

        btnCancel.onclick = () => {
            overlay.style.display = 'none';
            resolve(false);
        };
    });
};

window._slugify = function(text) {
    if (!text) return "";
    return text.toString().toLowerCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_').replace(/[^\w-]+/g, '').replace(/--+/g, '_');
};

window.toggleCamInputs = function (type) {
    const mode = document.getElementById(type === 'root' ? 'selInitCamMode' : 'selStepCamMode').value;
    const manualEl = document.getElementById(type === 'root' ? 'root-cam-manual' : 'step-cam-manual');
    const logEl = document.getElementById(type === 'root' ? 'root-cam-log' : 'step-cam-log');
    
    // Labels
    const lblPos = document.getElementById(type === 'root' ? 'lblInitPos' : 'lblStepPos');
    const lblDir = document.getElementById(type === 'root' ? 'lblInitDir' : 'lblStepDir');

    if (mode === 'log') {
        manualEl.style.display = 'none';
        logEl.style.display = 'block';
    } else {
        manualEl.style.display = 'grid';
        logEl.style.display = 'none';
        
        if (mode === 'names') {
            lblPos.textContent = "Objeto Posición";
            lblDir.textContent = "Objeto Dirección";
        } else {
            lblPos.textContent = "Posición [x, y, z]";
            lblDir.textContent = "Target [x, y, z]";
        }
    }
};

window.processRawCamLog = function (type) {
    const logInp = document.getElementById(type === 'root' ? 'inpInitRawLog' : 'inpStepRawLog');
    const posInp = document.getElementById(type === 'root' ? 'inpInitCam' : 'inpPosicion');
    const dirInp = document.getElementById(type === 'root' ? 'inpInitDir' : 'inpDireccion');
    const text = logInp.value.trim();

    const posMatch = text.match(/Pos:\s*\[([\d\.-]+,\s*[\d\.-]+,\s*[\d\.-]+)\]/);
    const targetMatch = text.match(/Target:\s*\[([\d\.-]+,\s*[\d\.-]+,\s*[\d\.-]+)\]/);

    if (posMatch && posMatch[1]) {
        posInp.value = `[${posMatch[1]}]`;
    }
    if (targetMatch && targetMatch[1]) {
        dirInp.value = `[${targetMatch[1]}]`;
    }

    if (posMatch || targetMatch) {
        // Al aplicar un log, cambiamos automáticamente al modo "Coordenadas (Manual)"
        document.getElementById(type === 'root' ? 'selInitCamMode' : 'selStepCamMode').value = 'coords';
        window.toggleCamInputs(type);
        window.validateMeshInput(posInp);
        window.validateMeshInput(dirInp);
        logInp.value = ''; 
    } else {
        alert("Formato de log no reconocido. Asegúrate de copiarlo tal cual de la consola.");
    }
};

window.smartPasteCamera = async function(idPos, idDir) {
    try {
        const text = await navigator.clipboard.readText();
        // Regex para capturar: [Camera Log] Pos: [x, y, z] Target: [x, y, z]
        // O simplemente: Pos: [x, y, z] Target: [x, y, z]
        const posMatch = text.match(/Pos:\s*\[([\d\.-]+,\s*[\d\.-]+,\s*[\d\.-]+)\]/);
        const targetMatch = text.match(/Target:\s*\[([\d\.-]+,\s*[\d\.-]+,\s*[\d\.-]+)\]/);

        if (posMatch && posMatch[1]) {
            document.getElementById(idPos).value = `[${posMatch[1]}]`;
            console.log(`[Editor] Posición pegada: [${posMatch[1]}]`);
        }
        if (targetMatch && targetMatch[1]) {
            document.getElementById(idDir).value = `[${targetMatch[1]}]`;
            console.log(`[Editor] Dirección pegada: [${targetMatch[1]}]`);
        }

        if (!posMatch && !targetMatch) {
            // Si no coincide con el log, intentar pegar el texto tal cual si parece una coordenada
            if (text.includes('[') && text.includes(']')) {
                document.getElementById(idPos).value = text;
            } else {
                alert("El portapapeles no contiene un formato de cámara válido.\nCopia el log de la consola: [Camera Log] Pos: [...] Target: [...]");
            }
        }
        
        // Ejecutar validación para que no se marque en rojo si es válido
        window.validateMeshInput(document.getElementById(idPos));
        window.validateMeshInput(document.getElementById(idDir));

    } catch (err) {
        console.error('Error al acceder al portapapeles:', err);
        alert("No se pudo acceder al portapapeles. Asegúrate de dar permisos.");
    }
};

window.generateAllAudio = async function() {
    if (!rawConfig || !rawConfig.menu) {
        alert('No hay datos cargados. Primero carga o guarda un JSON.');
        return;
    }

    const provider = document.getElementById('selAllTTSProvider')?.value
                     || localStorage.getItem('tts-provider')
                     || 'puter';
    const providerLabel = provider === 'puter' ? 'Puter AI' : 'ElevenLabs';
    const statusEl = document.getElementById('all-tts-status');

    // Recoger todos los nodos paso recursivamente
    const allNodes = [];
    const collect = (nodes) => {
        for (const n of nodes) {
            if (n.id && n.id.startsWith('paso')) allNodes.push(n);
            if (n.children?.length) collect(n.children);
        }
    };
    collect(rawConfig.menu);

    const withText = allNodes.filter(n => n.ESdescription || n.ENdescription);
    if (withText.length === 0) {
        alert('No se encontraron pasos con texto de locución.');
        return;
    }

    const totalAudios = withText.reduce((acc, n) =>
        acc + (n.ESdescription ? 1 : 0) + (n.ENdescription ? 1 : 0), 0);

    const confirmed = await window.showConfirm(
        '🎤 Generación Masiva',
        `Se van a generar <b>${totalAudios} audios</b> para <b>${withText.length} pasos</b> usando <b>${providerLabel}</b>.<br><br>Este proceso puede tardar varios minutos.`
    );
    if (!confirmed) return;

    statusEl.style.color = '#64748b';
    const results = { ok: 0, fail: [] };

    if (provider === 'puter') {
        // 1. Generar todos los blobs en memoria
        const batch = [];
        let step = 0;

        for (const node of withText) {
            const fileName   = node.id.replace('paso', '');
            const isEtiqueta = !!(node.etiqueta || node.flecha);
            const pairs = [
                { lang: 'es', text: node.ESdescription, subtitle: isEtiqueta ? node.subtitle    : '', flag: '🇪🇸' },
                { lang: 'en', text: node.ENdescription, subtitle: isEtiqueta ? node.subtitleEN  : '', flag: '🇬🇧' }
            ].filter(p => p.text);

            for (const { lang, text, subtitle, flag } of pairs) {
                step++;
                const hasSub = !!subtitle;
                statusEl.innerText = `${flag} Generando [${step}/${totalAudios}] ${node.name || node.id}${hasSub ? ' +sub' : ''}...`;
                try {
                    const audioBase64 = hasSub
                        ? await _generateCombinedAudioBase64(text, subtitle, lang)
                        : await _puterToBase64(text, lang);
                    batch.push({ lang, fileName, audioBase64, extraFileNames: [] });
                    results.ok++;
                } catch (e) {
                    console.error(`[GenerarTodos] ${lang} ${node.id}:`, e);
                    results.fail.push(`${lang.toUpperCase()} — ${node.name || node.id}: ${e.message}`);
                }
                // Si hay subtítulo la pausa ya está dentro de _generateCombinedAudioBase64
                if (!hasSub && step < totalAudios) await new Promise(r => setTimeout(r, 400));
            }
        }

        // 2. Guardar todo en una sola petición
        if (batch.length > 0) {
            statusEl.innerText = `💾 Guardando ${batch.length} archivos en disco...`;
            try {
                const resp = await fetch('http://localhost:3001/save-audios-batch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ audios: batch })
                });
                const result = await resp.json();
                if (result.status !== 'success') throw new Error(result.message);
                console.log('[GenerarTodos] Guardados:', result.saved);
            } catch (e) {
                results.fail.push(`Error al guardar en servidor: ${e.message}`);
            }
        }

    } else {
        // ElevenLabs: secuencial (el servidor genera y guarda)
        let step = 0;
        for (const node of withText) {
            const fileName   = node.id.replace('paso', '');
            const isEtiqueta = !!(node.etiqueta || node.flecha);
            const pairs = [
                { lang: 'es', text: node.ESdescription, subtitle: isEtiqueta ? node.subtitle   : '', flag: '🇪🇸' },
                { lang: 'en', text: node.ENdescription, subtitle: isEtiqueta ? node.subtitleEN : '', flag: '🇬🇧' }
            ].filter(p => p.text);

            for (const { lang, text, subtitle, flag } of pairs) {
                step++;
                const fullText = subtitle ? `${text}. ${subtitle}` : text;
                statusEl.innerText = `${flag} ElevenLabs [${step}/${totalAudios}] ${node.name || node.id}${subtitle ? ' +sub' : ''}...`;
                try {
                    await _generateTTSWithElevenLabs(fullText, lang, fileName, []);
                    results.ok++;
                } catch (e) {
                    console.error(`[GenerarTodos ElevenLabs] ${lang} ${node.id}:`, e);
                    results.fail.push(`${lang.toUpperCase()} — ${node.name || node.id}: ${e.message}`);
                }
            }
        }
    }

    // Resumen final
    if (results.fail.length === 0) {
        statusEl.innerText = `✅ ${results.ok} audios generados correctamente.`;
        statusEl.style.color = '#16a34a';
    } else if (results.ok > 0) {
        statusEl.innerText = `⚠️ ${results.ok} OK, ${results.fail.length} errores — ver consola.`;
        statusEl.style.color = '#d97706';
        console.warn('[GenerarTodos] Errores:', results.fail);
    } else {
        statusEl.innerText = `❌ Todos fallaron — ver consola.`;
        statusEl.style.color = '#dc2626';
        console.error('[GenerarTodos] Errores:', results.fail);
    }
};

init();
