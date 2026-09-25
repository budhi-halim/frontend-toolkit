import {LIQUID_MAP} from '../assets/liquid-map.js';
import {normalizeOptions} from '../core/schema.js';
import {svgNode,decorate,uid} from '../core/utils.js';

// === ORIGINAL GLASS OPTICS ===
export function createGlassRenderer(mount,input={}) {
  let options=normalizeOptions('glass',input);
  let width=1,height=1,variant='';
  const id=uid('ft-glass');
  const svg=svgNode('svg',{'aria-hidden':'true',width:0,height:0});
  decorate(svg,{position:'absolute',width:'0',height:'0',pointerEvents:'none'});
  const defs=svgNode('defs',{},svg);
  const pane=decorate(document.createElement('div'),{position:'absolute',inset:'0',borderRadius:'inherit',pointerEvents:'none'});
  mount.append(svg,pane);
  let filter,displacement,turbulence,offset;
  function build() {
    defs.replaceChildren(); variant=options.variant;
    filter=svgNode('filter',{id,'color-interpolation-filters':'sRGB'},defs);
    if(variant==='liquid'){
      svgNode('feImage',{result:'map',href:LIQUID_MAP,preserveAspectRatio:'none'},filter);
      displacement=svgNode('feDisplacementMap',{in:'SourceGraphic',in2:'map',xChannelSelector:'R',yChannelSelector:'G'},filter);
      turbulence=null;offset=null;
    }else{
      for(const [k,v] of Object.entries({x:'-500%',y:'-500%',width:'1100%',height:'1100%'}))filter.setAttribute(k,v);
      turbulence=svgNode('feTurbulence',{type:'turbulence',numOctaves:2,result:'rawTurbulence'},filter);
      offset=svgNode('feOffset',{in:'rawTurbulence',result:'centeredTurbulence',dx:0,dy:0},filter);
      displacement=svgNode('feDisplacementMap',{in:'SourceGraphic',in2:'centeredTurbulence',xChannelSelector:'R',yChannelSelector:'G'},filter);
    }
  }
  function svgBackend() {
    if(options.forceFallback||options.backend==='css')return false;
    if(options.backend==='svg')return true;
    // Syntax support alone does not prove SVG backdrop rendering. Keep an explicit override.
    return /Chrome|Chromium|Edg\//.test(navigator.userAgent)&&!/Firefox|FxiOS|CriOS|EdgiOS/.test(navigator.userAgent);
  }
  function update() {
    if(variant!==options.variant)build();
    displacement.setAttribute('scale',options.distortion);
    if(turbulence){
      turbulence.setAttribute('baseFrequency',options.frosting);
      turbulence.setAttribute('seed',options.seed);
      const ratio=.01/Math.max(options.frosting,.001);
      offset.setAttribute('dx',(width/2)*(1-ratio));offset.setAttribute('dy',(height/2)*(1-ratio));
    }
    const base=`blur(${options.blur}px) brightness(${options.brightness})`;
    const value=base+(svgBackend()?` url(#${id})`:'');
    pane.style.backdropFilter=value;pane.style.webkitBackdropFilter=value;
    pane.style.opacity=String(options.opacity);
    pane.style.background=`color-mix(in srgb,${options.tint} ${options.tintOpacity*100}%,transparent)`;
    pane.style.boxShadow=`inset 0 0 0 1px ${options.edgeColor},inset 0 0 20px oklch(1 0 0 / .035),0 12px 40px oklch(0 0 0 / ${options.shadow})`;
  }
  const api={
    animated:false,
    setOptions(next){options=normalizeOptions('glass',next,options);update();},
    resize(w,h){width=w;height=h;update();},
    render(){},
    getState(){return {backend:svgBackend()?'SVG backdrop':'CSS backdrop',reason:svgBackend()?'SVG refraction selected; visual support depends on the browser.':'Native blur/tint fallback; SVG backdrop refraction is not active.',filterId:id};},
    destroy(){svg.remove();pane.remove();}
  };
  update();return api;
}
