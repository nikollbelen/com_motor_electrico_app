import { ModalEquipo } from './ModalEquipo.js';

export default {
  title: 'Modales/ModalEquipo',
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'white' },
  },
  argTypes: {
    name: { control: 'text' },
    type: { control: 'text' },
    manufacturer: { control: 'text' },
    fuel: { control: 'text' },
    status: { control: 'text' },
    wear: { control: 'text' },
  },
};

const Template = (args) => {
  const container = document.createElement('div');
  container.id = 'modalequipo-mount';
  
  setTimeout(() => {
    new ModalEquipo('modalequipo-mount', args);
  }, 0);
  
  return container;
};

export const PorDefecto = Template.bind({});
PorDefecto.storyName = 'Diseño de Escritorio';
PorDefecto.args = {
  name: 'AeroCore Turbofan A-12',
  type: 'Alta Presión',
  manufacturer: 'AeroCore Ind.',
  fuel: '15,000 lbs',
  status: 'ACTIVO',
  lastInspection: '12/2026',
  nextService: '12/2027',
  wear: '14%',
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
