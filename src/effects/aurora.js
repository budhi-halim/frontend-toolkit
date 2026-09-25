import {AURORA_FRAGMENT} from '../shaders/aurora.js';
import {createGpuRenderer} from './gpu.js';
import {getDefaults} from '../core/schema.js';
import {colorRGB} from '../core/utils.js';
export function createAuroraRenderer(mount,input={},onState){
  return createGpuRenderer(mount,AURORA_FRAGMENT,{...getDefaults('aurora'),...input},{
    effect:'aurora',
    seedTime:true,
    effective:(o,q)=>({...o,layers:Math.max(8,o.layers*q.detail)}),
    stats:o=>({effectiveLayers:Math.round(o.layers)}),
    uniforms:o=>({u_cameraSpeed:0.1,u_cameraSwaySpeed:0.2,u_cameraSwayAmplitude:o.sway,u_cameraTilt:o.tilt,u_cameraFov:o.fov,u_cameraDistance:2.5,u_auroraLayers:o.layers,u_auroraSpeed:o.auroraSpeed,u_breathSpeed:o.breathSpeed,u_breathOffset:1,u_breathAmplitude:o.breath,u_colorBottom:colorRGB(o.color),u_colorTop:colorRGB(o.topColor),u_colorProportion:o.proportion,u_skyTop:[.008,.018,.045],u_skyBottom:[.001,.003,.012],u_showStars:o.stars>0?1:0,u_starDistance:31,u_starSize:.18,u_starColor:[.8,.88,1],u_starOpacity:o.stars,u_starDensityBottom:0,u_starDensityTop:.7,u_starSkewExponent:2}),
    fallback:o=>`radial-gradient(ellipse at 45% -30%,${o.color},transparent 64%),radial-gradient(ellipse at 85% 20%,${o.topColor},transparent 60%),linear-gradient(oklch(0.13 0.03 260),oklch(0.08 0.02 260))`
  },onState);
}
