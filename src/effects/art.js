import {ART_FRAGMENT} from '../shaders/art.js';
import {createGpuRenderer} from './gpu.js';
import {createCreativeFallback} from '../core/creative-fallback.js';
import {colorRGB} from '../core/utils.js';
import {createMetaballMotion} from '../core/metaball-motion.js';
export function createArtRenderer(mount,input={},onState){
  return createGpuRenderer(mount,ART_FRAGMENT,input,{
    effect:'art',simulation:createMetaballMotion,effective:(o,q)=>({...o,detail:q.detail}),
    uniforms:o=>({uKind:['metaballs','silk','interference','tunnel'].indexOf(o.kind),uAmount:o.amount,uScale:o.scale,uRelief:o.relief,uLightAngle:o.lightAngle*Math.PI/180,uDetail:o.detail??1,uSeed:o.seed,uColor:colorRGB(o.color),uColor2:colorRGB(o.color2),uBackground:colorRGB(o.background),uTransparent:o.transparent?1:0}),
    portable:(layer,o)=>createCreativeFallback(layer,'art',o),
    fallback:o=>o.transparent?'transparent':o.background,
    stats:o=>({study:o.kind,raySteps:o.kind==='metaballs'?Math.round(24+36*o.detail):0})
  },onState);
}
