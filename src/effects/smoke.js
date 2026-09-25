import {SMOKE_FRAGMENT} from '../shaders/smoke.js';
import {createGpuRenderer} from './gpu.js';
import {getDefaults} from '../core/schema.js';
import {colorRGB} from '../core/utils.js';
export function createSmokeRenderer(mount,input={},onState){
  return createGpuRenderer(mount,SMOKE_FRAGMENT,{...getDefaults('smoke'),...input},{
    effect:'smoke',effective:(o,q)=>({...o,steps:Math.max(12,Math.round(o.steps*q.detail))}),
    uniforms:o=>({uSeed:o.seed,uScale:o.scale,uDensity:o.density,uTurbulence:o.turbulence,uWind:o.wind,uSpread:o.spread,uRise:o.rise,uLight:o.light,uColor:colorRGB(o.color),uSteps:o.steps,uDepth:o.depth,uShadow:o.shadow,uLightAngle:o.lightAngle}),
    stats:o=>({volumeSamples:o.steps,volume:'3D density; front-to-back extinction'}),
    fallback:o=>`radial-gradient(ellipse at 46% 45%,color-mix(in srgb,${o.color} 55%,transparent),transparent 65%),radial-gradient(ellipse at 57% 65%,color-mix(in srgb,${o.color} 40%,transparent),transparent 45%)`
  },onState);
}
