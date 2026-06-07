import { ModalInformacion } from './ModalInformacion.js';

export default {
  title: 'Modales/ModalInformacion',
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'white' },
  },
  argTypes: {
    title: { control: 'text' },
    content: { control: 'text' },
    status: { control: 'text' },
  },
};

const Template = (args) => {
  const container = document.createElement('div');
  container.id = 'modalinformacion-mount';
  
  setTimeout(() => {
    new ModalInformacion('modalinformacion-mount', args);
  }, 0);
  
  return container;
};

export const PorDefecto = Template.bind({});
PorDefecto.storyName = 'Diseño de Escritorio';
PorDefecto.args = {
  title: 'Inyector de Combustible de Alta Presión',
  content: `El inyector de alta precisión gestiona la atomización del combustible en la cámara de combustión. Requiere mantenimiento preventivo cada 5,000 horas de operación para asegurar la eficiencia térmica y reducir emisiones contaminantes. El sensor piezoeléctrico integrado monitorea la presión en tiempo real.`,
  status: 'Estado de Mantenimiento: Óptimo',
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
