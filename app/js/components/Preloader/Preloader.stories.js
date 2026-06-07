import { Preloader } from './Preloader.js';

export default {
  title: 'Componentes/Preloader',
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'white' },
  },
  argTypes: {
    progress: { control: { type: 'range', min: 0, max: 100, step: 1 } },
    title: { control: 'text' },
    subtitle: { control: 'text' },
  },
};

const Template = (args) => {
  const container = document.createElement('div');
  container.id = 'preloader-mount';
  
  setTimeout(() => {
    new Preloader('preloader-mount', args);
  }, 0);
  
  return container;
};

export const Escritorio = Template.bind({});
Escritorio.storyName = 'Diseño de Escritorio';
Escritorio.args = {
  progress: 84,
  title: 'AetherLab',
  subtitle: 'ADVANCED SIMULATION SYSTEM',
};

export const Movil = Template.bind({});
Movil.storyName = 'Diseño Móvil';
Movil.parameters = {
  viewport: {
    defaultViewport: 'mobile1',
  },
};
Movil.args = {
  ...Escritorio.args,
};
