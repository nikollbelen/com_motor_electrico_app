import { ModalObjetivos } from './ModalObjetivos.js';

export default {
  title: 'Modales/ModalObjetivos',
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'white' },
  },
  argTypes: {
    title: { control: 'text' },
    subtitle: { control: 'text' },
    progress: { control: { type: 'range', min: 0, max: 100, step: 1 } },
  },
};

const Template = (args) => {
  const container = document.createElement('div');
  container.id = 'modalobjetivos-mount';
  
  setTimeout(() => {
    new ModalObjetivos('modalobjetivos-mount', args);
  }, 0);
  
  return container;
};

export const PorDefecto = Template.bind({});
PorDefecto.storyName = 'Diseño de Escritorio';
PorDefecto.args = {
  title: 'OBJETIVOS DEL LABORATORIO',
  subtitle: 'Objetivos Principales y Ruta de Aprendizaje',
  progress: 25,
  objectives: [
    'Identificar componentes y subsistemas clave.',
    'Comprender flujos de fluido internos.',
    'Simular escenarios de falla operativos.',
    'Entrenar en la resolución de problemas técnicos.',
  ],
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
