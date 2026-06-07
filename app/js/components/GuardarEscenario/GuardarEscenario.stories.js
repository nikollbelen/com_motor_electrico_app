import { GuardarEscenario } from './GuardarEscenario.js';

export default {
  title: 'Modales/GuardarEscenario',
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'white' },
  },
};

const Template = () => {
  const container = document.createElement('div');
  container.id = 'guardarescenario-mount';
  
  setTimeout(() => {
    new GuardarEscenario('guardarescenario-mount');
  }, 0);
  
  return container;
};

export const PorDefecto = Template.bind({});
PorDefecto.storyName = 'Diseño de Escritorio';

export const Movil = Template.bind({});
Movil.storyName = 'Diseño Móvil';
Movil.parameters = {
  viewport: {
    defaultViewport: 'mobile1',
  },
};
