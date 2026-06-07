import { ModalAyuda } from './ModalAyuda.js';

export default {
  title: 'Componentes/ModalNavegacion',
  parameters: {
    layout: 'fullscreen',
  },
};

const Template = (args) => {
  console.log("[Storybook] Ejecutando Template...");
  const container = document.createElement('div');
  container.style.cssText = `
    width: 100vw;
    height: 100vh;
    background: #0f172a;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  `;

  const modal = new ModalAyuda(container);
  
  setTimeout(() => {
    if (args.lang) modal.setLanguage(args.lang);
    modal.open();
  }, 500);
  
  return container;
};

export const Escritorio = Template.bind({});
Escritorio.storyName = 'Vista Escritorio';
Escritorio.args = {
  lang: 'es'
};

export const Movil = Template.bind({});
Movil.storyName = 'Vista Móvil';
Movil.args = {
  lang: 'es'
};
Movil.parameters = {
  viewport: {
    defaultViewport: 'mobile1',
  },
};
