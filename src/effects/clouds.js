import {CLOUDS_FRAGMENT} from '../shaders/atmosphere.js';
import {createGpuRenderer} from './gpu.js';
import {getDefaults} from '../core/schema.js';
import {colorRGB} from '../core/utils.js';
export function createCloudsRenderer(mount,input={},onState){
  return createGpuRenderer(mount,CLOUDS_FRAGMENT,{...getDefaults('clouds'),...input},{
    effect:'clouds',
    uniforms:o=>({uSeed:o.seed,uScale:o.scale,uDensity:o.density,uWind:o.wind,uLight:o.light,uCoverage:o.coverage,uSoftness:o.softness,uTransparent:o.transparent?1:0,uColor:colorRGB(o.color),uColor2:colorRGB(o.shadowColor),uColor3:colorRGB(o.skyColor)}),
    fallback:o=>`radial-gradient(ellipse at 35% 55%,${o.color},transparent 65%),radial-gradient(ellipse at 80% 40%,${o.color},transparent 60%),linear-gradient(${o.transparent?'transparent':o.skyColor},${o.transparent?'transparent':o.skyColor})`
  },onState);
}
