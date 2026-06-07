import { MenuLateral } from './MenuLateral.js';
import './MenuLateral.css';

export default { title: 'Componentes/MenuLateral' };

const Template = (args) => {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'width:100vw; height:100vh; position:relative; overflow:hidden;';
  const mount = document.createElement('div');
  mount.id = 'sb-menu-mount';
  wrapper.appendChild(mount);
  setTimeout(() => new MenuLateral('sb-menu-mount', args.items, args.menuIconImage, args.labName), 50);
  return wrapper;
};

export const PorDefecto = Template.bind({});
PorDefecto.storyName = 'Menú Lateral';
PorDefecto.args = {
  labName: 'Molino SAG',
  menuIconImage: '/images/icon1.png',
  items: [
    { id: 'paso_libre',          icon: '/images/icon3.png', ESdescription: 'Movimiento Libre'  },
    { id: 'paso_partes',         icon: '/images/icon2.png', ESdescription: 'Lista de Partes'   },
    { id: 'paso_explosion',      icon: '/images/icon5.png', ESdescription: 'Explosión'          },
    { id: 'paso_funcionamiento', icon: '/images/icon4.png', ESdescription: 'Funcionamiento'     },
  ],
};
