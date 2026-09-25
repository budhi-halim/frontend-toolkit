import {SEA_FRAGMENT} from '../shaders/sea.js';
import {createGpuRenderer} from './gpu.js';
import {createCreativeFallback} from '../core/creative-fallback.js';
import {colorRGB} from '../core/utils.js';
export function createSeaRenderer(mount,input={},onState){
  return createGpuRenderer(mount,SEA_FRAGMENT,input,{
    effect:'sea',effective:(o,q)=>({...o,detail:Math.max(2,Math.round(o.detail*q.detail))}),
    uniforms:o=>({uAmplitude:o.waveHeight,uWaveSpeed:o.waveSpeed,uWaveDirection:o.waveDirection*Math.PI/180,uRipples:o.ripples,uChop:o.choppiness,uScale:o.waveScale,uWind:o.wind,uHorizon:o.horizon,uSunElevation:o.sunElevation,uSunAzimuth:o.sunAzimuth,uSunSize:o.sunSize,uFog:o.fog,uReflection:o.reflection,uDetail:o.detail,uSeed:o.seed,uSky:colorRGB(o.skyColor),uHorizonColor:colorRGB(o.horizonColor),uWater:colorRGB(o.waterColor),uSunColor:colorRGB(o.sunColor)}),
    portable:(layer,o)=>createCreativeFallback(layer,'sea',o),
    fallback:o=>`linear-gradient(${o.skyColor},${o.horizonColor} 45%,${o.waterColor})`,
    stats:o=>({waveOctaves:o.detail,fidelity:'Procedural height-field ocean; not a fluid dynamics simulation'})
  },onState);
}
