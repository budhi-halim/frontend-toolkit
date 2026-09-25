import {WATER_FRAGMENT} from '../shaders/water.js';
import {createGpuRenderer} from './gpu.js';
import {getDefaults} from '../core/schema.js';
import {colorRGB, mulberry32} from '../core/utils.js';

// === EXPLICIT WATER TEXTURES ===
export function createWaterTexture(kind='pool',seed=7) {
  if (kind==='none') return null;
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
  const ctx=canvas.getContext('2d');const random=mulberry32(seed);
  ctx.fillStyle=kind==='sand'?'#b6ac8d':'#5099a1';ctx.fillRect(0,0,512,512);
  if(kind==='pool'){
    for(let y=0;y<512;y+=32)for(let x=0;x<512;x+=32){
      const light=39+random()*19;
      ctx.fillStyle=`hsl(${184+random()*10} 28% ${light}%)`;ctx.fillRect(x+1,y+1,30,30);
      ctx.fillStyle='rgba(220,248,245,.22)';ctx.fillRect(x+2,y+2,28,1);
    }
  }else{
    for(let i=0;i<14000;i++){
      const v=80+Math.floor(random()*150);ctx.fillStyle=`rgba(${v},${v*.93},${v*.7},.2)`;
      ctx.fillRect(random()*512,random()*512,random()*2+1,random()*2+1);
    }
    for(let i=0;i<36;i++){
      ctx.beginPath();const x=random()*512,y=random()*512;ctx.ellipse(x,y,random()*9+2,random()*5+2,random()*3,0,Math.PI*2);
      ctx.fillStyle='rgba(79,81,63,.23)';ctx.fill();
    }
  }
  return canvas;
}
export function createWaterRenderer(mount, input={}, onState) {
  const options={...getDefaults('water'),...input};
  const texture=(device,o)=>device?.setSource(createWaterTexture(o.texture,o.seed)).catch(error=>onState?.('error',error.message));
  return createGpuRenderer(mount,WATER_FRAGMENT,options,{
    effect:'water',
    seedTime:true,
    uniforms:o=>({uFlowSpeed:o.flowSpeed,uMorphSpeed:o.morphSpeed,uScale:o.scale,uWindDir:[o.windX,o.windY],uDistortionStrength:o.distortion,uCausticStrength:o.caustic,uRidgeSharpness:o.ridge,uTintOpacity:o.tintOpacity,uColorTint:colorRGB(o.tint),uColorHighlight:colorRGB(o.highlight)}),
    fallback:o=>`radial-gradient(ellipse at 25% 20%,${o.highlight} -100%,transparent 80%),linear-gradient(135deg,${o.tint},oklch(0.2 0.035 230))`,
    init:texture,
    update:(device,o,p)=>{if(o.texture!==p.texture||o.seed!==p.seed)texture(device,o);}
  },onState);
}
