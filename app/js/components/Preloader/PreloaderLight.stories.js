import { PreloaderLight } from './PreloaderLight.js';
import '../../../css/components/Componentes.css';

export default { title: 'Componentes/PreloaderLight' };

const Template = (args) => {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'width:100vw; height:100vh; position:relative; overflow:hidden;';
  const mount = document.createElement('div');
  mount.id = 'sb-plight-mount';
  wrapper.appendChild(mount);
  
  setTimeout(() => {
    const p = new PreloaderLight('sb-plight-mount', { 
        labNameES: args.labNameES, 
        labNameEN: args.labNameEN, 
        logoUrl: args.logoUrl 
    });
    
    if (args.simularCarga) {
      let pct = 0;
      const iv = setInterval(() => { 
          pct += 5; 
          p.setProgress(pct); 
          if (pct >= 100) clearInterval(iv); 
      }, 200);
    }
  }, 50);
  
  return wrapper;
};

export const PorDefecto = Template.bind({});
PorDefecto.storyName = 'Pantalla de carga (Light)';
PorDefecto.args = { 
    labNameES: 'Molino SAG', 
    labNameEN: 'SAG Mill', 
    logoUrl: '/images/logo-tecsup.png', 
    simularCarga: false 
};

export const ConCargaSimulada = Template.bind({});
ConCargaSimulada.storyName = 'Con carga simulada (0→100%)';
ConCargaSimulada.args = { 
    labNameES: 'Molino SAG', 
    labNameEN: 'SAG Mill', 
    logoUrl: '/images/logo-tecsup.png', 
    simularCarga: true 
};
