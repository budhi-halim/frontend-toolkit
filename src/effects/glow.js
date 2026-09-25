import {ORIGINAL_PALETTES} from '../assets/original-palettes.js';
import {normalizeOptions} from '../core/schema.js';
import {decorate} from '../core/utils.js';
import {roundedPerimeter,ellipticalPerimeter,borderRadiusPixels,roundedPath} from '../core/geometry.js';

// === TRANSPARENT, ARC-LENGTH-PARAMETERIZED LIGHT ===
export function createGlowRenderer(mount,input={}){
  let options=normalizeOptions('glow',input),width=1,height=1,padding=0,scale=1,contour=null,points=[],lastTime=0,radius=0,quality=1,ramp=null,lastKey='';
  const canvas=decorate(document.createElement('canvas'),{position:'absolute',pointerEvents:'none',display:'block'}),buffer=document.createElement('canvas');mount.append(canvas);
  const ctx=canvas.getContext('2d'),edge=buffer.getContext('2d'),palette=document.createElement('canvas');palette.width=1024;palette.height=1;const paletteCtx=palette.getContext('2d',{willReadFrequently:true});
  function rebuildRamp(){
    const gradient=paletteCtx.createLinearGradient(0,0,1024,0);
    if(options.palette==='custom'){
      const gap=1-options.trail;gradient.addColorStop(0,'transparent');gradient.addColorStop(gap,'transparent');gradient.addColorStop(gap+options.trail*.15,options.color);gradient.addColorStop(gap+options.trail*.5,options.color2);gradient.addColorStop(1,options.color3);
    }else{
      if(options.trail<1){gradient.addColorStop(0,'transparent');gradient.addColorStop(Math.max(0,1-options.trail-.001),'transparent');}
      const stops=ORIGINAL_PALETTES[options.palette].split(',').map(s=>s.trim());stops.forEach((stop,i)=>{const m=stop.match(/^(.*?)(?:\s+([\d.]+)%)?$/);gradient.addColorStop((1-options.trail)+(m[2]!==undefined?Number(m[2])/100:i/Math.max(1,stops.length-1))*options.trail,m[1]);});
    }
    paletteCtx.clearRect(0,0,1024,1);paletteCtx.fillStyle=gradient;paletteCtx.fillRect(0,0,1024,1);ramp=paletteCtx.getImageData(0,0,1024,1).data;
  }
  function layout(){
    radius=borderRadiusPixels(mount,width,height);padding=Math.ceil(options.glow*2.5+options.width+3);scale=Math.min(globalThis.devicePixelRatio||1,options.dprCap)*Math.max(.6,options.quality)*quality;
    const w=width+2*padding,h=height+2*padding;scale*=Math.min(1,2048/(w*scale),2048/(h*scale));
    const key=[w,h,scale,radius,options.width,options.shape].join(',');if(lastKey===key)return;lastKey=key;
    Object.assign(canvas.style,{left:`${-padding}px`,top:`${-padding}px`,width:`${w}px`,height:`${h}px`});canvas.width=buffer.width=Math.max(1,Math.round(w*scale));canvas.height=buffer.height=Math.max(1,Math.round(h*scale));
    const inset=options.width/2;contour=options.shape==='ellipse'?ellipticalPerimeter(Math.max(0,width-options.width),Math.max(0,height-options.width)):roundedPerimeter(Math.max(0,width-options.width),Math.max(0,height-options.width),Math.max(0,radius-inset));
    const count=Math.max(48,Math.min(800,Math.ceil(contour.length/(3/quality))));points=[];
    for(let i=0;i<=count;i++){const point=contour.pointAt(i/count*contour.length);points.push({x:point.x+padding+inset,y:point.y+padding+inset,f:i/count});}
  }
  function cutout(inverted=true){
    const path=new Path2D();if(inverted)path.rect(0,0,canvas.width,canvas.height);
    const x=(padding+options.width)*scale,y=x,w=Math.max(0,width-2*options.width)*scale,h=Math.max(0,height-2*options.width)*scale;
    if(options.shape==='ellipse')path.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2);
    else roundedPath(path,x,y,w,h,Math.max(0,radius-options.width)*scale);
    return path;
  }
  function paint(time){
    lastTime=time;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);if(options.width===0||!contour)return;
    edge.setTransform(1,0,0,1,0,0);edge.clearRect(0,0,buffer.width,buffer.height);edge.setTransform(scale,0,0,scale,0,0);edge.lineWidth=options.width;edge.lineCap='round';
    const velocity=options.speedMode==='pixels'?options.velocity:contour.length/options.duration;
    const offset=options.angle/360+(time*velocity/Math.max(contour.length,.001))*(options.reverse?-1:1);
    for(let i=0;i<points.length-1;i++){
      const a=points[i],b=points[i+1],phase=((a.f-offset)%1+1)%1,index=Math.min(1023,Math.floor(phase*1024))*4,alpha=ramp[index+3]/255;if(alpha<.005)continue;
      edge.strokeStyle=`rgba(${ramp[index]},${ramp[index+1]},${ramp[index+2]},${alpha})`;edge.beginPath();edge.moveTo(a.x,a.y);edge.lineTo(b.x,b.y);edge.stroke();
    }
    if(options.glow>0&&options.intensity>0){ctx.save();if(options.bloomPlacement==='outside')ctx.clip(cutout(),'evenodd');else if(options.bloomPlacement==='inside')ctx.clip(cutout(false));ctx.globalAlpha=Math.min(1,options.intensity);ctx.filter=`blur(${options.glow*scale}px) brightness(${Math.max(1,options.intensity)})`;ctx.drawImage(buffer,0,0);ctx.restore();}
    ctx.drawImage(buffer,0,0);canvas.style.opacity=String(options.opacity);
  }
  rebuildRamp();layout();paint(0);
  return{
    releasable:true,
    get animated(){return options.width>0&&(options.speedMode==='duration'||options.velocity>0);},
    get canvas(){return canvas;},setOptions(next){options=normalizeOptions('glow',next,options);rebuildRamp();layout();paint(lastTime);},resize(w,h){width=w;height=h;layout();paint(lastTime);},
    setQuality(next){const q=Math.max(.55,next.scale);if(Math.abs(q-quality)>.15){quality=q;layout();}},render:paint,
    getState(){return{backend:'Canvas arc-length border',perimeterPixels:Math.round(contour?.length??0),linearSpeed:options.speedMode==='pixels'?options.velocity:(contour?.length??0)/options.duration,bloomPlacement:options.bloomPlacement,pixels:[canvas.width,canvas.height]};},
    destroy(){canvas.remove();canvas.width=canvas.height=buffer.width=buffer.height=1;points=[];ramp=null;}
  };
}
