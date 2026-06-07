# 🏗️ Ecosistema Plantilla Laboratorio 3D

Este proyecto es un motor de navegación 3D industrial basado en **Verge3D**. Permite la creación de laboratorios interactivos mediante una configuración basada en datos (`info.json`).

## 🚀 Inicio Rápido

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Lanzar el Servidor de Desarrollo**:
   Este servidor es necesario para guardar cambios desde el Editor y gestionar el inventario de activos.
   ```bash
   npm run server
   ```

3. **Abrir el Editor**:
   Navega a la carpeta `/dev-tools/editor.html` en tu navegador.

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
  - `verge3d_assets/`: Archivos fuente del molino (.gltf, .bin, .js).
- `/dev-tools`: Herramientas de edición y automatización.
  - `editor.html` + `editor-ui.js`: Interfaz visual para modificar el `info.json`.
  - `save-server.js`: Backend Node.js para persistencia de datos.
  - `scan-assets.js`: Escáner de metadatos GLTF.
  - `build-app.js`: Empaquetador inteligente de producción.
- `/build`: Carpeta generada por `npm run build` (no se sube a Git).

---

## 📝 Reglas de Oro para Desarrolladores

1. **No modificar visual_logic.js manualmente**: Salvo para ajustes estructurales del motor. Toda la lógica de pasos debe ir en `info.json`.
2. **Servidor Activo**: El Editor requiere que `npm run server` esté ejecutándose para guardar cambios.
3. **Escaneo tras cambios 3D**: Si añades nuevos objetos en Blender o Max, corre `npm run scan` para que el Editor los reconozca.
4. **Limpieza de Marca**: Tras importar o actualizar los archivos de Verge3D, corre siempre `npm run v3d-clean` para mantener el laboratorio libre de marcas de agua.
5. **Siempre usa `build:dry` antes de entregar**: Confirma qué archivos irán al cliente antes de hacer el build definitivo.

---

## 📸 Herramientas de Depuración de Cámara

Para facilitar la configuración de las coordenadas de la cámara en el `info.json`, el motor incluye un sistema de depuración que permite la traslación manual (no solo órbita) y el monitoreo en tiempo real.

### Comandos de Consola (F12)

| Función | Descripción |
|---|---|
| `enableCameraDebug()` | Activa el panel de control manual (flechas en pantalla) y habilita los logs de coordenadas en la consola. |
| `disableCameraDebug()` | Oculta el panel de depuración y deshabilita los logs de cámara. |

### Características del Debugger

- **Traslación Pura:** A diferencia del control de órbita estándar (zoom), los botones **F** (Adelante) y **B** (Atrás) mueven físicamente la cámara y su punto de enfoque por el espacio, permitiendo encuadres precisos.
- **Monitoreo en Tiempo Real:** El panel muestra las coordenadas exactas de **Posición** (POS) y **Objetivo** (TAR).
- **Logs Copiables:** Cada movimiento imprime en la consola una línea con el formato exacto que espera el Editor: `[Camera Log] Pos: [...] Target: [...]`.
- **Sensibilidad:** El sistema está calibrado con saltos de 50 unidades para un ajuste fino y profesional.

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
