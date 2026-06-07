import { Etiqueta } from './Etiqueta.js';

export default {
  title: 'Componentes/Etiqueta',
  parameters: {
    layout: 'fullscreen',
    backgrounds: { 
      default: 'oscuro',
      values: [
        { name: 'oscuro', value: '#1a1a1a' },
      ],
    },
  },
  argTypes: {
    title: { control: 'text' },
    subtitle: { control: 'text' },
    status: { control: 'text' },
    top: { control: 'text' },
    left: { control: 'text' },
  },
};

const Template = (args) => {
  const container = document.createElement('div');
  container.id = 'etiqueta-mount';
  
  setTimeout(() => {
    new Etiqueta('etiqueta-mount', args);
  }, 0);
  
  return container;
};

export const PorDefecto = Template.bind({});
PorDefecto.storyName = 'Diseño de Escritorio';
PorDefecto.args = {
  title: 'Cylinder Head A-12',
  subtitle: 'High-pressure combustion unit',
  status: 'Active • 450°C',
  top: '45%',
  left: '60%',
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
  top: '40%',
  left: '20%',
};

export const PosicionAlternativa = Template.bind({});
PosicionAlternativa.args = {
  title: 'Motor Central',
  subtitle: 'Unidad de potencia principal',
  status: 'Standby • 25°C',
  top: '20%',
  left: '30%',
};
