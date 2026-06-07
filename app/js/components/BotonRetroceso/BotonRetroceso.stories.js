import { BotonRetroceso } from './BotonRetroceso.js';
import '../../../css/components/Componentes.css';

export default { title: 'Componentes/BotonRetroceso' };

const Template = () => {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'width:100vw; height:100vh; position:relative;';
  const mount = document.createElement('div');
  mount.id = 'sb-retroceso-mount';
  wrapper.appendChild(mount);
  setTimeout(() => { const b = new BotonRetroceso('sb-retroceso-mount'); b.mostrar(); }, 50);
  return wrapper;
};

export const PorDefecto = Template.bind({});
PorDefecto.storyName = 'Botón de Retroceso';
