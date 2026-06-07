import { AyudasViewer } from './AyudasViewer.js';
import '../../../css/components/Componentes.css';

export default { title: 'Componentes/AyudasViewer' };

const Template = (args) => {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'width:100vw; height:100vh; position:relative; overflow:hidden;';
  const mount = document.createElement('div');
  mount.id = 'sb-ayudas-mount';
  wrapper.appendChild(mount);
  setTimeout(() => new AyudasViewer('sb-ayudas-mount', args.buttons), 50);
  return wrapper;
};

export const PorDefecto = Template.bind({});
PorDefecto.storyName = 'Botones flotantes de ayuda';
PorDefecto.args = {
  buttons: [
    { id: 'btn_ayuda',     icon: '/images/ayuda.png',       labelES: 'Ayuda',    labelEN: 'Help',       contentClass: 'content1' },
    { id: 'btn_objetivos', icon: '/images/objetivo.png',    labelES: 'Objetivos',labelEN: 'Objectives', contentClass: 'content2' },
    { id: 'btn_equipo',    icon: '/images/equipo.png',      labelES: 'Equipo',   labelEN: 'Equipment',  contentClass: 'content3' },
    { id: 'btn_sonido',    icon: '/images/audio.png',       labelES: 'Audio',    labelEN: 'Audio',      contentClass: '' },
    { id: 'btn_lang',      icon: '/images/translation.png', labelES: 'Idioma',   labelEN: 'Language',   contentClass: '' },
  ]
};
