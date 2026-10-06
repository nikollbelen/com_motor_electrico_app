# Laboratorio 3D — Motor Eléctrico

Este proyecto es un laboratorio 3D interactivo sobre un **motor eléctrico**, construido con **Verge3D**. Permite estudiar sus componentes mediante navegación guiada, etiquetas, audios bilingües, despiece, herramientas visuales de inspección y modo de clase en vivo. La experiencia se controla desde `app/info.json`.

## Funcionalidades del laboratorio

- Visualización interactiva del motor eléctrico en 3D.
- Vista libre del modelo.
- Recorrido guiado por componentes.
- Cámaras automáticas por paso.
- Etiquetas y flechas técnicas.
- Subtítulos por componente.
- Audios por paso en español e inglés.
- Cambio de idioma ES/EN.
- Botón de sonido/mute.
- Resaltado de piezas.
- Ocultar/mostrar mallas según el paso.
- Modo explosión/despiece del motor.
- Animaciones nativas de desarme.
- Límite de zoom configurable.
- Modo cristal/glass.
- Modo rayos X / clipping.
- Modal de ayuda.
- Modal de objetivos.
- Modal de equipo/EPP soportado.
- Preloader personalizado.
- Menú lateral desktop y menú móvil.
- Botón de retroceso.
- Debug de cámara con panel de movimiento y logs copiables.
- Debug de resaltados y clipping.
- Editor visual para modificar `info.json`.
- Escaneo de mallas y animaciones desde GLTF.
- Sincronización de audios al reordenar pasos.
- Generación de locuciones con ElevenLabs o guardado de audios desde el editor.
- Build de producción con copiado selectivo de assets.

### Componentes incluidos en el recorrido

- Cubierta frontal
- Rodamiento
- Eje
- Rotor
- Caja de conexiones
- Carcasa
- Estator
- Ventilador
- Cubierta trasera

## Salas en vivo, snapshots y Q&A

El laboratorio incluye una capa colaborativa para clases o presentaciones:

- Crear una sala con nombre personalizado.
- Reactivar una sala existente.
- Compartir enlace `viewer.html?room=<sala>` con alumnos.
- Viewer de alumnos en modo solo lectura.
- Verificación de sala activa antes de cargar el modelo.
- Pantalla de sala cerrada.
- Sincronización en tiempo real de cámara, pasos, reset y hover/resaltados.
- Ejecución local de comandos en el viewer para mantener animaciones fluidas.
- Conteo de alumnos conectados por presencia.
- Voz en vivo del presentador usando WebRTC.
- Botón para que el alumno escuche la voz del presentador.
- Preguntas de alumnos en tiempo real.
- Panel del presentador para ver y marcar preguntas como respondidas.
- Badges de preguntas pendientes.
- Snapshots compartibles por URL.
- Snapshot guarda cámara, paso actual, idioma y estado visual.
- Modo snapshot-only con `viewer.html?snapshot=<id>`.

## Requisitos

- Node.js 18+
- npm 9+
- Navegador moderno con soporte WebGL
- Servidor estático local para abrir la app como sitio web
- Proyecto de Supabase para salas, snapshots y Q&A
- ElevenLabs API Key opcional para generar locuciones

## 🚀 Inicio Rápido

1. **Clonar el repositorio**:
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd com_motor_electrico_app
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Lanzar el servidor de edición**:
   Este servidor es necesario para guardar cambios desde el Editor y gestionar el inventario de activos.
   ```bash
   npm run server
   ```

4. **Abrir el laboratorio**:
   Sirve la carpeta `app/` con un servidor estático o Live Server y abre:
   ```text
   app/index.html
   ```

5. **Abrir el Editor**:
   Navega a la carpeta `/dev-tools/editor.html` en tu navegador.

6. **Usar salas o snapshots**:
   - Configura Supabase en los `<meta>` tags de `app/index.html` y `app/viewer.html`, o inyecta `window.__SUPABASE_CONFIG__`.
   - Ejecuta `app/js/realtime/supabase-schema.sql` en Supabase.
   - Usa los botones **Sala**, **Micrófono**, **Preguntas** y **Snapshot** desde la app.

---

## 📋 Referencia de Comandos

| Comando | Descripción |
|---|---|
| `npm run server` | Inicia el servidor de edición (puerto 3001). Ejecuta un **escaneo inicial automático** de activos y permite guardar cambios. |
| `npm run scan` | Escanea el modelo `.gltf` definido en `info.json` y actualiza la base de activos. |
| `npm run build` | Empaqueta la app en `build/<nombre_modelo>/` lista para producción. |
| `npm run build:clean` | Limpia el build anterior y genera uno nuevo. |
| `npm run build:dry` | Simula el build mostrando qué se copiaría y qué se omitiría, sin escribir nada. |
| `npm run v3d-clean` | **Limpieza de activos**: Elimina marcas de agua, banners de trial y logs de Verge3D de los archivos del modelo. |
| `npm run storybook` | Abre el Storybook de componentes en el puerto 6006. |
| `npm run elevenlabs` | Genera audios desde las descripciones de `info.json` usando ElevenLabs. |

### 🏗️ Build de Producción

El empaquetador es inteligente y hace lo siguiente automáticamente:

- **Nombre dinámico**: Lee `verge3dUrl` del `info.json` para nombrar la carpeta de salida (ej. `CHINALCO_MOLINO_SAG`).
- **Filtro de imágenes**: Solo incluye las imágenes que están referenciadas en el `info.json`. Imágenes sin usar no viajan a producción.
- **Filtro de stories**: Excluye todos los archivos `.stories.js` de Storybook.
- **Assets 3D completos**: La carpeta `verge3d_assets/` se copia íntegra, sin filtros.

```bash
# Build estándar
npm run build

# Opciones avanzadas (usando node directamente)
node dev-tools/build-app.js --clean            # Limpiar antes de empaquetar
node dev-tools/build-app.js --dry-run          # Ver log sin escribir nada
node dev-tools/build-app.js --out=./dist       # Carpeta de salida personalizada
node dev-tools/build-app.js --help             # Ver toda la ayuda
```

---

## 🛠️ Herramientas de Desarrollo

### 🔍 Sincronización de Activos (Smart-Check)

**Modo Automático**:
El servidor (`npm run server`) ejecuta `scan-assets` automáticamente cada vez que se inicia. Además, el laboratorio puede sincronizar los activos directamente consultando el endpoint `/assets`.

### 🧹 Limpieza de Modelado (Verge3D Cleanup)

Cuando se copia un nuevo modelado desde Verge3D (archivos `.html` y `v3d.js`), estos suelen incluir marcas de agua y logs de licencia Trial. 

Ejecuta este comando **una sola vez** tras copiar nuevos archivos a `verge3d_assets/`:
```bash
npm run v3d-clean
```
Esta herramienta:
- Elimina el banner "MADE WITH VERGE3D TRIAL".
- Borra los logs de consola sobre la versión y estado de la licencia.
- Limpia metadatos y comentarios de marca en el HTML.
- Elimina el botón de pantalla completa por defecto (`fullscreen-button`).
- Realiza un barrido general de la marca "VERGE3D" para una presentación blanca y profesional.

---

## 🌐 API del Servidor de Desarrollo (Puerto 3001)

El servidor expone los siguientes endpoints para facilitar la integración con el Editor y la App:

- **`GET /assets`**: Devuelve el contenido de `assets_db.json` (lista de mallas y animaciones).
- **`POST /assets`**: Permite actualizar la base de datos de activos desde el cliente.
- **`POST /save`**: Guarda el estado actual de la configuración en `info.json`.
- **CORS Habilitado**: Permite peticiones desde cualquier origen y desactiva el cache para asegurar datos frescos.

---

## 🏗️ Arquitectura del Proyecto

- `/app`: Contiene el laboratorio 3D y la lógica del motor.
  - `info.json`: **Single Source of Truth**. Toda la navegación se define aquí.
  - `index.html`: aplicación principal para el presentador.
  - `viewer.html`: vista para alumnos, salas y snapshots.
  - `verge3d_assets/`: archivos fuente del motor eléctrico (.gltf, .bin, .js).
  - `js/realtime/`: sincronización con Supabase, voz WebRTC, Q&A y snapshots.
- `/dev-tools`: Herramientas de edición y automatización.
  - `editor.html` + `editor-ui.js`: Interfaz visual para modificar el `info.json`.
  - `save-server.js`: Backend Node.js para persistencia de datos.
  - `scan-assets.js`: Escáner de metadatos GLTF.
  - `build-app.js`: Empaquetador inteligente de producción.
- `/build`: Carpeta generada por `npm run build` (no se sube a Git).

## Configuración de Supabase para colaboración

Las funciones de sala, snapshots y preguntas usan Supabase. El cliente se configura desde:

- `<meta name="supabase-url">`
- `<meta name="supabase-anon-key">`

en `app/index.html` y `app/viewer.html`, o mediante `window.__SUPABASE_CONFIG__` antes de importar el módulo realtime.

Ejecuta este archivo en el SQL Editor de Supabase:

```text
app/js/realtime/supabase-schema.sql
```

Este script crea:

- `room_states`: estado actual de cada sala.
- `snapshots`: capturas compartibles de la escena.
- `room_questions`: preguntas de alumnos.
- Políticas RLS básicas.
- Publicación realtime para las tablas necesarias.

---

## 📝 Reglas de Oro para Desarrolladores

1. **No modificar visual_logic.js manualmente**: Salvo para ajustes estructurales del motor. Toda la lógica de pasos debe ir en `info.json`.
2. **Servidor Activo**: El Editor requiere que `npm run server` esté ejecutándose para guardar cambios.
3. **Escaneo tras cambios 3D**: Si añades nuevos objetos en Blender o Max, corre `npm run scan` para que el Editor los reconozca.
4. **Limpieza de Marca**: Tras importar o actualizar los archivos de Verge3D, corre siempre `npm run v3d-clean` para mantener el laboratorio libre de marcas de agua.
5. **Siempre usa `build:dry` antes de entregar**: Confirma qué archivos irán al cliente antes de hacer el build definitivo.

---

## 🛠️ Funciones de Depuración desde la Consola del Navegador

El motor expone un conjunto de funciones globales en `window` que puedes ejecutar directamente desde la consola de DevTools (F12) sin necesidad de modificar código.

### ⚠️ Requisito previo: contexto correcto

El laboratorio carga el motor 3D dentro de un **iframe**. Si la consola apunta al iframe en lugar de la página principal, las funciones no estarán disponibles.

**Pasos para ejecutar cualquier función de debug:**

1. Abre DevTools con **F12**.
2. Ve a la pestaña **Console**.
3. En el selector de contexto (dropdown arriba del campo de texto), selecciona **`top`** — no el iframe `motorElectrico.html`.
4. Espera a que aparezca el mensaje `[Debug Tip]` en color magenta en la consola — eso indica que el motor está listo.
5. Escribe la función y presiona Enter.

```
[ top ▼ ]  >  enableGlassMode()
```

---

### 🪟 Modo Cristal (Glass Mode)

Convierte todos los materiales del modelo en vidrio semitransparente y abre un panel flotante con sliders para ajustar los valores en tiempo real.

| Función | Descripción |
|---|---|
| `enableGlassMode()` | Activa el modo cristal con valores por defecto y abre el panel de control. |
| `enableGlassMode({ color, opacity, roughness, thickness, transmission })` | Activa el modo cristal con parámetros personalizados. |
| `disableGlassMode()` | Restaura todos los materiales originales del modelo. |

**Ejemplo con parámetros custom:**
```js
enableGlassMode({ color: '#aaccff', opacity: 0.4, roughness: 0.02, thickness: 2, transmission: 1 })
```

**El panel flotante permite ajustar en tiempo real:**
- Color del vidrio
- Opacidad (0–1)
- Rugosidad (0–1)
- Grosor (0–5)
- Transmisión (0–1)

Cierra el panel con el botón **Cerrar Panel** o restaura con `disableGlassMode()`.

---

### 📸 Depuración de Cámara

Para facilitar la configuración de coordenadas de cámara en el `info.json`.

| Función | Descripción |
|---|---|
| `enableCameraDebug()` | Activa el panel de control manual (flechas en pantalla) y habilita los logs de coordenadas. |
| `disableCameraDebug()` | Oculta el panel y deshabilita los logs. |

- **Traslación Pura:** Los botones **F** (Adelante) y **B** (Atrás) mueven físicamente la cámara y su punto de enfoque.
- **Monitoreo en Tiempo Real:** El panel muestra **Posición** (POS) y **Objetivo** (TAR) exactos.
- **Logs Copiables:** Cada movimiento imprime en la consola el formato exacto que espera el Editor: `[Camera Log] Pos: [...] Target: [...]`.

---

### 🎨 Depuración de Resaltados y Clipping

| Función | Descripción |
|---|---|
| `debugHighlightUI()` | Abre el panel de control de resaltados (color, intensidad, objetos). |
| `debugClippingUI()` | Abre el panel de control del plano de corte (clipping) en tiempo real. |

---

### 🔬 Modo Rayos X (X-Ray)

| Función | Descripción |
|---|---|
| `enableXRay()` | Activa el plano de corte para ver el interior del modelo. |
| `disableXRay()` | Desactiva el plano de corte. |

---
*Desarrollado con estándares de ingeniería senior para máxima escalabilidad.*

---

## 🎙️ Integración con ElevenLabs (TTS)

Este proyecto incluye una integración profesional con ElevenLabs para generar locuciones automáticas a partir de las descripciones en español de los pasos.

### Configuración
1. Crea un archivo `.env` en la raíz del proyecto.
2. Agrega tus credenciales:
   ```env
   ELEVENLABS_API_KEY=tu_api_key
   ELEVENLABS_VOICE_ID=id_de_la_voz
   ```

### Generación Masiva de Audios
Para generar todos los audios del laboratorio basados en el `info.json` (campo `ESdescription`), ejecuta:
```bash
npm run elevenlabs
```
*   **Destino:** `app/audios/`
*   **Filtro:** Solo procesa descripciones en español.
*   **Optimización:** No vuelve a generar audios que ya existen físicamente en la carpeta, ahorrando créditos de API.

### Generación Individual (Editor)
Dentro del `editor.html`, puedes gestionar los audios directamente en el campo de **Nombre** de cada paso:
*   **Botón ▶️:** Reproduce el audio actual asociado al paso (ruta `app/audios/ID.mp3`).
*   **Botón 🎙️:** Genera o actualiza la locución basándose en el texto escrito en el nombre. Solicita confirmación antes de sobrescribir el archivo existente.
