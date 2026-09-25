import {FIRE_FRAGMENT} from '../shaders/fire.js';
import {createGpuRenderer} from './gpu.js';
import {getDefaults} from '../core/schema.js';
import {colorRGB} from '../core/utils.js';
export function createFireRenderer(mount,input={},onState){
  return createGpuRenderer(mount,FIRE_FRAGMENT,{...getDefaults('fire'),...input},{
    effect:'fire',
    padding:o=>o.mode==='out'?Math.ceil(o.reach*Math.max(1.6+(o.respectGravity?o.gravity:0)*.7,o.height+(o.respectGravity?o.gravity:0)*.6*o.height*o.height+.4)+14):0,
    effective:(o,q)=>({...o,detail:q.detail}),
    uniforms:o=>({uSeed:o.seed,uScale:o.scale,uHeight:o.height,uIntensity:o.intensity,uTurbulence:o.turbulence,uWind:o.wind,uSpread:o.spread,uSourceOffset:o.sourceOffset,uFlameSpeed:o.flameSpeed,uFlickerSpeed:o.flickerSpeed,uEmbers:o.embers,uColor:colorRGB(o.color),uColor2:colorRGB(o.midColor),uColor3:colorRGB(o.coreColor),uModel:['ribbon','classic','candle','embers'].indexOf(o.model),uOutside:o.mode==='out'?1:0,uDirection:['up','right','down','left','outward'].indexOf(o.direction),uEdge:['auto','top','right','bottom','left','all'].indexOf(o.sourceEdge),uReach:o.reach,uGravity:o.respectGravity?o.gravity:0,uBorder:o.outPolicy==='border'?1:0,uFilament:o.filament,uBlue:o.blueBase,uDetail:o.detail??1}),
    stats:o=>({placement:o.mode,flameModel:o.model,sourceEdges:o.sourceEdge,fireVisibility:o.mode==='out'?o.outPolicy:'inside',gravityEnabled:o.respectGravity,flameSpeed:o.flameSpeed,flickerSpeed:o.flickerSpeed,sourceWidth:o.spread,sourceOffset:o.sourceOffset}),
    fallback:o=>o.mode==='out'?`radial-gradient(ellipse at 50% 50%,transparent 42%,${o.color} 48%,transparent 60%)`:`radial-gradient(ellipse at 50% 110%,${o.coreColor},${o.midColor} 18%,${o.color} 37%,transparent 65%)`
  },onState);
}
