import { VistaPrincipal } from './VistaPrincipal.js';

export default {
  title: 'Vistas/VistaPrincipal',
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'white' },
  },
};

const Template = (args) => {
  const container = document.createElement('div');
  container.id = 'vistaprincipal-mount';
  
  setTimeout(() => {
    new VistaPrincipal('vistaprincipal-mount', {
        tieneBotonLang: true,
        tieneBotonSonido: true,
        tieneBotonGuardar: true,
        tieneBotonAyuda: true,
        tieneBotonObjetivos: true,
        tieneBotonEquipo: true,
        ...args
    });
  }, 0);
  
  return container;
};

export const PorDefecto = Template.bind({});
PorDefecto.storyName = 'Diseño de Escritorio';
PorDefecto.args = {
  menuItems: [
    { id: 'paso1', ESdescription: 'Vista Libre', ENdescription: 'Free View', icon: 'deployed_code' },
    { id: 'paso2', ESdescription: 'Partes', ENdescription: 'Components', icon: 'settings_input_component' },
    { id: 'paso3', ESdescription: 'Explosión', ENdescription: 'Explosion', icon: 'open_in_full' }
  ]
};

export const Movil = Template.bind({});
Movil.storyName = 'Diseño Móvil';
Movil.parameters = {
  viewport: {
    defaultViewport: 'mobile1',
  },
};
