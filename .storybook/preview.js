const link1 = document.createElement('link');
link1.rel = 'stylesheet';
link1.href = 'https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700&display=swap';
document.head.appendChild(link1);

const link2 = document.createElement('link');
link2.rel = 'stylesheet';
link2.href = 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap';
document.head.appendChild(link2);

// CSS global de la app (sistema de idiomas, reset, layout)
import '../app/css/main.css';

/* =====================================================
 * PALETAS DE COLOR — Laboratorio 3D
 * Cada paleta define las variables CSS que se inyectan
 * dinamicamente al seleccionar un tema en la toolbar.
 * ===================================================== */
const PALETTES = {
  'blue-core': {
    label: 'Blue Core Reactor',
    vars: {
      '--color-primary':           '#0066ff',
      '--color-primary-light':     '#66aaff',
      '--color-primary-rgb':       '0, 102, 255',
      '--color-on-primary':        '#ffffff',
      '--color-primary-container': '#003cbf',
      '--color-surface':           '#0b1326',
      '--color-on-surface':        '#1a1c1e',
      '--color-on-surface-variant':'#44474e',
      '--glow-primary':            'rgba(0, 102, 255, 0.45)',
      '--glow-primary-strong':     'rgba(0, 102, 255, 0.75)',
      '--gradient-primary':        'linear-gradient(135deg, #0066ff 0%, #003cbf 100%)',
    },
  },
  'cyan-plasma': {
    label: 'Cyan Plasma Lab',
    vars: {
      '--color-primary':           '#00c8e0',
      '--color-primary-light':     '#7de8f5',
      '--color-primary-rgb':       '0, 200, 224',
      '--color-on-primary':        '#001f24',
      '--color-primary-container': '#008fa0',
      '--color-surface':           '#071318',
      '--color-on-surface':        '#1a1c1e',
      '--color-on-surface-variant':'#44474e',
      '--glow-primary':            'rgba(0, 200, 224, 0.45)',
      '--glow-primary-strong':     'rgba(0, 200, 224, 0.75)',
      '--gradient-primary':        'linear-gradient(135deg, #00c8e0 0%, #007a8a 100%)',
    },
  },
  'violet-forge': {
    label: 'Violet Forge',
    vars: {
      '--color-primary':           '#7c3aed',
      '--color-primary-light':     '#a78bfa',
      '--color-primary-rgb':       '124, 58, 237',
      '--color-on-primary':        '#ffffff',
      '--color-primary-container': '#5b21b6',
      '--color-surface':           '#0d0b1a',
      '--color-on-surface':        '#1a1c1e',
      '--color-on-surface-variant':'#44474e',
      '--glow-primary':            'rgba(124, 58, 237, 0.45)',
      '--glow-primary-strong':     'rgba(124, 58, 237, 0.75)',
      '--gradient-primary':        'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
    },
  },
  'amber-fusion': {
    label: 'Amber Fusion',
    vars: {
      '--color-primary':           '#f59e0b',
      '--color-primary-light':     '#fcd34d',
      '--color-primary-rgb':       '245, 158, 11',
      '--color-on-primary':        '#1a0e00',
      '--color-primary-container': '#b45309',
      '--color-surface':           '#160f00',
      '--color-on-surface':        '#1a1c1e',
      '--color-on-surface-variant':'#44474e',
      '--glow-primary':            'rgba(245, 158, 11, 0.45)',
      '--glow-primary-strong':     'rgba(245, 158, 11, 0.75)',
      '--gradient-primary':        'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)',
    },
  },
  'emerald-core': {
    label: 'Emerald Core',
    vars: {
      '--color-primary':           '#10b981',
      '--color-primary-light':     '#6ee7b7',
      '--color-primary-rgb':       '16, 185, 129',
      '--color-on-primary':        '#ffffff',
      '--color-primary-container': '#065f46',
      '--color-surface':           '#061210',
      '--color-on-surface':        '#1a1c1e',
      '--color-on-surface-variant':'#44474e',
      '--glow-primary':            'rgba(16, 185, 129, 0.45)',
      '--glow-primary-strong':     'rgba(16, 185, 129, 0.75)',
      '--gradient-primary':        'linear-gradient(135deg, #10b981 0%, #065f46 100%)',
    },
  },
};

/* =====================================================
 * APLICAR PALETA — Escribe las variables CSS en :root
 * ===================================================== */
function applyPalette(paletteName) {
  const palette = PALETTES[paletteName] || PALETTES['blue-core'];
  const root = document.documentElement;
  Object.entries(palette.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  // Actualizar tambien el bloque de overrides de alta especificidad
  let overrideStyle = document.getElementById('lab-theme-overrides');
  if (!overrideStyle) {
    overrideStyle = document.createElement('style');
    overrideStyle.id = 'lab-theme-overrides';
    document.head.appendChild(overrideStyle);
  }
  overrideStyle.textContent = `
    /* ===============================================
     * LAB THEME OVERRIDES — Paleta: ${palette.label}
     * Maxima especificidad para sobreescribir Tailwind.
     * =============================================== */

    .text-primary       { color: ${palette.vars['--color-primary']} !important; }
    .text-primary-light { color: ${palette.vars['--color-primary-light']} !important; }
    .bg-primary         { background-color: ${palette.vars['--color-primary']} !important; }
    .border-primary     { border-color: ${palette.vars['--color-primary']} !important; }

    .Preloader-royal-gradient {
      background: ${palette.vars['--gradient-primary']} !important;
    }
    .Preloader-progress-shimmer {
      background: linear-gradient(
        90deg,
        ${palette.vars['--color-primary']},
        #ffffff,
        ${palette.vars['--color-primary']}
      ) !important;
      background-size: 200% 100% !important;
    }
    .Preloader-primary-glow {
      box-shadow:
        0 0 0 1px ${palette.vars['--glow-primary']},
        0 8px 20px ${palette.vars['--glow-primary']},
        0 20px 50px ${palette.vars['--glow-primary']},
        0 0 60px ${palette.vars['--glow-primary']} !important;
    }
  `;
}

// Aplicar paleta por defecto al cargar
applyPalette('blue-core');
requestAnimationFrame(() => applyPalette('blue-core'));
setTimeout(() => applyPalette('blue-core'), 600);

/* =====================================================
 * GLOBAL TYPES — Selector de paleta en la Toolbar
 * Aparece como un menu desplegable en la barra superior
 * de Storybook con un icono de pincel.
 * ===================================================== */
export const globalTypes = {
  palette: {
    name: 'Paleta',
    description: 'Selecciona la paleta de colores del Laboratorio 3D',
    defaultValue: 'blue-core',
    toolbar: {
      icon: 'paintbrush',
      items: Object.entries(PALETTES).map(([value, { label }]) => ({ value, title: label })),
      showName: true,
      dynamicTitle: true,
    },
  },
};

/* =====================================================
 * DECORATORS — Reacciona al cambio de paleta en la UI
 * Cada vez que el usuario elige una paleta en la toolbar,
 * este decorator aplica las nuevas variables CSS al root.
 * ===================================================== */
export const decorators = [
  (StoryFn, context) => {
    const selectedPalette = context.globals.palette || 'blue-core';
    applyPalette(selectedPalette);
    return StoryFn();
  },
];

export const parameters = {
  backgrounds: {
    default: 'blanco',
    values: [
      { name: 'blanco',    value: '#ffffff' },
      { name: 'claro',     value: '#f8fafc' },
      { name: 'oscuro',    value: '#0b1326' },
    ],
  },
  controls: {
    matchers: {
      color: /(background|color)$/i,
      date: /Date$/,
    },
  },
};