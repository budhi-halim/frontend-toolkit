import {FIELD_FRAGMENT} from '../shaders/field.js';
import {createGpuRenderer} from './gpu.js';
import {getDefaults} from '../core/schema.js';
import {colorRGB} from '../core/utils.js';
import {createRainRenderer} from './rain.js';
import {normalizeOptions} from '../core/schema.js';
function createFieldGpu(mount,input={},onState){
  return createGpuRenderer(mount,FIELD_FRAGMENT,{...getDefaults('field'),...input},{effect:'field',effective:(o,q)=>({...o,detail:Math.max(2,o.detail*q.detail)}),uniforms:o=>({uKind:['ocean','lava','nebula','rain','iridescence','magnetic'].indexOf(o.kind),uScale:o.scale,uIntensity:o.intensity,uDetail:o.detail,uDistortion:o.distortion,uWind:o.wind,uColor:colorRGB(o.color),uColor2:colorRGB(o.color2),uTransparent:o.transparent?1:0,uSeed:o.seed,uOceanAmplitude:o.oceanAmplitude}),stats:o=>({study:o.kind}),fallback:o=>o.transparent?'transparent':`radial-gradient(ellipse at 30% 30%,${o.color2},transparent 75%),linear-gradient(145deg,${o.color},oklch(.12 .02 260))`},onState);
}

// A rain-only element allocates no WebGL context. Switching field kinds releases
// the old backend before constructing the new one, with the same public contract.
export function createFieldRenderer(mount,input={},onState) {
  let options=normalizeOptions('field',input),renderer=null,width=1,height=1;
  function create(){renderer=options.kind==='rain'?createRainRenderer(mount,options):createFieldGpu(mount,options,onState);renderer.resize(width,height);}
  create();
  return {releasable:true,get animated(){return renderer.animated;},get maxFPS(){return renderer.maxFPS;},get canvas(){return renderer.canvas;},get device(){return renderer.device;},
    setOptions(patch){const before=options;options=normalizeOptions('field',patch,options);if((before.kind==='rain')!==(options.kind==='rain')){renderer.destroy();create();}else renderer.setOptions(options);},
    setQuality(q){renderer.setQuality(q);},resize(w,h){width=w;height=h;renderer.resize(w,h);},render(t){renderer.render(t);},
    setPointer(p){renderer.setPointer?.(p);},suspendInput(){renderer.suspendInput?.();},clear(){renderer.clear?.();},
    getUniforms(){return renderer.getUniforms?.()??{};},getState(){return renderer.getState();},destroy(){renderer.destroy();}};
}
