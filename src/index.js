export {createFallRenderer} from './effects/fall.js';
export {createStatusRenderer} from './effects/status.js';
export {createPatternRenderer} from './effects/pattern.js';
export {createBackdropRenderer} from './effects/backdrop.js';
export {createHighlightRenderer} from './effects/highlight.js';
import {getDefaults} from './core/schema.js';
import {bindEffectInput} from './core/input.js';
import {RENDERERS} from './registry.js';
import {createController} from './core/controller.js';
import {decorate} from './core/utils.js';
export {defineElements,EffectElement} from './elements.js';
export {SCHEMAS,COMMON_SCHEMA,PRESETS,getDefaults,normalizeOptions,canonicalPreset} from './core/schema.js';
export {schedulerStats} from './core/scheduler.js';
export {createGlassRenderer} from './effects/glass.js';
export {createSurfaceRenderer} from './effects/surface.js';
export {createWaterRenderer,createWaterTexture} from './effects/water.js';
export {createFireRenderer} from './effects/fire.js';
export {createSmokeRenderer} from './effects/smoke.js';
export {createCloudsRenderer} from './effects/clouds.js';
export {createAuroraRenderer} from './effects/aurora.js';
export {createGlowRenderer} from './effects/glow.js';
export {createController} from './core/controller.js';
export {createFluidRenderer} from './effects/fluid.js';
export {createTrailRenderer} from './effects/trail.js';
export {createFieldRenderer} from './effects/field.js';
export {makeDraggable} from './core/drag.js';
export {preload,loadEffect,loadingStats} from './core/catalog.js';
export {captureDOM,bindWaterSnapshot} from './adapters/snapshot.js';
export {createSeaRenderer} from './effects/sea.js';
export {createArtRenderer} from './effects/art.js';
export {createSketchRenderer} from './effects/sketch.js';
export {resolveMotion} from './core/motion.js';
export const version='1.0.0';

// === OPTIONAL CONTROLLER FOR ORDINARY ELEMENTS ===
// Shared leases avoid restoring `position` while another effect still needs it.
const positionLeases=new WeakMap();
export function mountEffect(host,{effect='glass',preset,...options}={}){
  if(!(host instanceof HTMLElement))throw new TypeError('mountEffect() needs an HTML element.');
  if(!Object.hasOwn(RENDERERS,effect))throw new RangeError(`Unknown effect: ${effect}`);
  let lease=positionLeases.get(host);
  if(!lease){lease={count:0,previous:host.style.position,changed:getComputedStyle(host).position==='static'};positionLeases.set(host,lease);if(lease.changed)host.style.position='relative';}
  lease.count++;
  const layer=decorate(document.createElement('span'),{display:'block',position:'absolute',inset:'0',borderRadius:'inherit',pointerEvents:'none',zIndex:'0'});
  layer.dataset.ftLayer=effect;layer.setAttribute('aria-hidden','true');host.prepend(layer);
  function release(){layer.remove();if(--lease.count===0){positionLeases.delete(host);if(lease.changed&&host.style.position==='relative')host.style.position=lease.previous;}}
  let controller,inputBinding;
  try{controller=createController(host,layer,effect,RENDERERS[effect],{...getDefaults(effect,preset),...options});inputBinding=bindEffectInput(host,{effect,options:()=>controller.options,deliver:p=>controller.setPointer(p)});}
  catch(error){controller?.destroy();release();throw error;}
  const destroy=controller.destroy.bind(controller);let disposed=false;
  controller.destroy=()=>{if(disposed)return;disposed=true;inputBinding.destroy();destroy();release();};
  return controller;
}

export {setDiagnostics,getDiagnostics,environmentReport,probeWebGL,diagnose} from './core/diagnostics.js';
