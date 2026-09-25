import {normalizeOptions} from '../core/schema.js';
import {decorate,colorRGB,uid,mulberry32} from '../core/utils.js';
import {requestMaterial,cancelMaterial} from '../core/material-worker.js';

// === STATIC MATERIALS WITH HEIGHT-DERIVED DIRECTIONAL LIGHTING ===
export function createSurfaceRenderer(mount,input={},onState=()=>{}){
  let options=normalizeOptions('surface',input),width=1,height=1,disposed=false,revision=0,timer=0,pending=false,key='';
  const savedBackground=mount.style.background;
  const owner=uid('surface'),canvas=decorate(document.createElement('canvas'),{position:'absolute',inset:'0',width:'100%',height:'100%',borderRadius:'inherit',pointerEvents:'none'});canvas.width=1;canvas.height=1;mount.append(canvas);
  const ctx=canvas.getContext('2d',{alpha:false});
  function request(){
    if(disposed)return;canvas.style.opacity=String(options.opacity);canvas.style.background=options.color;
    if(options.forceFallback){clearTimeout(timer);cancelMaterial(owner);revision++;key='';pending=false;canvas.style.visibility='hidden';mount.style.background=options.color;return;}canvas.style.visibility='';mount.style.background=savedBackground;
    const scale=Math.min(globalThis.devicePixelRatio||1,options.dprCap)*options.quality,factor=Math.min(1,1024/Math.max(width*scale,height*scale));
    const w=Math.max(1,Math.round(width*scale*factor)),h=Math.max(1,Math.round(height*scale*factor));
    const {material,color,grainX,grainY,detail,depth,roughness,orientation,lightAngle,elevation,seed,contrast,fibers,weathering,woodSpecies,woodCut,woodFinish,ringScale,pores,knots,paperKind,marbleKind}=options;
    const data={material,color,grainX,grainY,detail,depth,roughness,orientation,lightAngle,elevation,seed,contrast,fibers,weathering,woodSpecies,woodCut,woodFinish,ringScale,pores,knots,paperKind,marbleKind};const next=JSON.stringify([w,h,width,height,data]);if(next===key)return;key=next;
    clearTimeout(timer);const current=++revision;pending=true;
    timer=setTimeout(async()=>{
      try{
        const result=await requestMaterial(owner,{width:w,height:h,cssWidth:width,cssHeight:height,options:data,rgb:colorRGB(color)});if(!result||disposed||current!==revision)return;
        canvas.width=result.width;canvas.height=result.height;ctx.putImageData(new ImageData(new Uint8ClampedArray(result.data),result.width,result.height),0,0);
        if(material==='paper'&&fibers>0){const random=mulberry32(seed);ctx.lineWidth=.4;ctx.strokeStyle='rgba(87,74,53,.085)';ctx.globalAlpha=fibers;ctx.beginPath();for(let i=0,n=Math.round(result.width*result.height/85);i<n;i++){const x=random()*result.width,y=random()*result.height,angle=random()*Math.PI*2,length=(paperKind==='washi'?3:1)+random()*(paperKind==='washi'?14:paperKind==='kraft'?8:3);ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(angle)*length,y+Math.sin(angle)*length);}ctx.stroke();ctx.globalAlpha=1;}
        pending=false;onState('surface-ready');
      }catch(error){if(!disposed&&current===revision){pending=false;key='';onState('error',error.message);}}
    },35);
  }
  request();return{animated:false,setOptions(next){options=normalizeOptions('surface',next,options);request();},resize(w,h){width=w;height=h;request();},render(){},get canvas(){return canvas;},getState(){return{backend:options.forceFallback?'CSS fallback':'Canvas material',material:options.material,...(options.material==='wood'?{woodSpecies:options.woodSpecies,woodCut:options.woodCut,woodFinish:options.woodFinish}:options.material==='paper'?{paperKind:options.paperKind}:{}),pixels:[canvas.width,canvas.height],pending,reason:'Generated once per configuration; no per-frame texture work.'};},destroy(){if(disposed)return;disposed=true;revision++;clearTimeout(timer);cancelMaterial(owner);canvas.remove();canvas.width=1;canvas.height=1;mount.style.background=savedBackground;}};
}
