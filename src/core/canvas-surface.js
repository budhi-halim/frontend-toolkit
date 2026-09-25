import {decorate,finite,clamp,colorRGB} from './utils.js';
import {borderRadiusPixels,roundedPath} from './geometry.js';

// === SMALL SHARED CANVAS LIFECYCLE; THE CONTROLLER OWNS ALL CLOCKS ===
export function createCanvasSurface(mount,options,{maxSide=2048,maxPixels=1400000}={}){
  if(!mount?.append)throw new TypeError('A mounted decorative layer is required.');
  const canvas=decorate(document.createElement('canvas'),{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none',borderRadius:'inherit'});
  canvas.setAttribute('aria-hidden','true');const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas 2D is unavailable.');mount.append(canvas);
  let width=1,height=1,scale=1,q={scale:1,particles:1,name:'Full'},disposed=false;
  function resize(w=width,h=height){
    width=clamp(finite(w,1),1,100000);height=clamp(finite(h,1),1,100000);
    const desired=Math.min(globalThis.devicePixelRatio||1,options.dprCap)*options.quality*q.scale;
    scale=Math.max(.001,Math.min(desired,maxSide/width,maxSide/height,Math.sqrt(maxPixels/(width*height))));
    const cw=Math.max(1,Math.floor(width*scale)),ch=Math.max(1,Math.floor(height*scale)),changed=cw!==canvas.width||ch!==canvas.height;
    if(changed){canvas.width=cw;canvas.height=ch;}canvas.style.opacity=String(options.opacity);return changed;
  }
  const api={canvas,ctx,get width(){return width;},get height(){return height;},get scale(){return scale;},get quality(){return q;},get radius(){return borderRadiusPixels(mount,width,height);},get disposed(){return disposed;},resize,
    setOptions(next){options=next;resize();},setQuality(next={}){const previous=q;q={...q,...next,scale:clamp(finite(next.scale,q.scale),.1,1),particles:clamp(finite(next.particles,q.particles),.1,1)};if(Math.abs(q.scale-previous.scale)>.04)return resize();return false;},
    begin(){if(disposed)return false;ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.filter='none';ctx.shadowBlur=0;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.setTransform(scale,0,0,scale,0,0);return true;},
    clip(){const p=new Path2D();roundedPath(p,0,0,width,height,api.radius);ctx.clip(p);},
    getState(){return{pixels:[canvas.width,canvas.height],qualityLevel:q.name,renderScale:scale};},
    destroy(){if(disposed)return;disposed=true;canvas.remove();canvas.width=canvas.height=1;}
  };resize();return api;
}
export function rgba(color,alpha=1){const [r,g,b]=colorRGB(color);return `rgba(${Math.round(r*255)},${Math.round(g*255)},${Math.round(b*255)},${clamp(alpha,0,1)})`;}
export function roundedFill(ctx,x,y,w,h,r){if(w<=0||h<=0)return;ctx.beginPath();roundedPath(ctx,x,y,w,h,r);ctx.fill();}
export function cachedGrain(seed,size=96){
  let state=seed|0;const canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d'),image=ctx.createImageData(size,size);
  for(let i=0;i<image.data.length;i+=4){state=Math.imul(state^state>>>13,1597334677)+12345|0;const value=(state>>>24)&255;image.data[i]=image.data[i+1]=image.data[i+2]=value;image.data[i+3]=255;}ctx.putImageData(image,0,0);return canvas;
}
