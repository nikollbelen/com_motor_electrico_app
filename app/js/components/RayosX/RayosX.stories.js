import { RayosX } from './RayosX.js';

export default {
  title: 'Componentes/RayosX',
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'white' },
  },
  argTypes: {
    opacity: { control: { type: 'range', min: 0, max: 100, step: 1 } },
  },
};

const Template = (args) => {
  const container = document.createElement('div');
  container.id = 'rayosx-mount';
  container.style.cssText = 'width:100vw; height:100vh; background-color:#0b1326; position:relative;';
  
  setTimeout(() => {
    new RayosX('rayosx-mount', args);
  }, 0);
  
  return container;
};

export const PorDefecto = Template.bind({});
PorDefecto.storyName = 'Diseño de Escritorio';
PorDefecto.args = {
  opacity: 50,
};

export const Movil = Template.bind({});
Movil.storyName = 'Diseño Móvil';
Movil.parameters = {
  viewport: {
    defaultViewport: 'mobile1',
  },
};
Movil.args = {
  ...PorDefecto.args,
};
