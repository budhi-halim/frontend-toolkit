import {decorate,colorRGB,mulberry32} from './utils.js';
import {seaSurface} from './sea-model.js';

// === SMALL CPU FIELDS FOR THE NEW OPTICAL FAMILIES ===
export function createCreativeFallback(mount,effect,input){
  let options=input,width=1,height=1,quality=1,frame,colors={},pointer={x:.5,y:.5,active:false},disposed=false,bodies=null;
  const canvas=decorate(document.createElement('canvas'),{position:'absolute',inset:'0',width:'100%',height:'100%',borderRadius:'inherit',pointerEvents:'none'});
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas 2D is unavailable.');mount.append(canvas);
  const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
  function resize(w,h,q=quality){
    width=Math.max(1,w);height=Math.max(1,h);quality=q;
    const limit=(effect==='sea'?240:280)*Math.sqrt(options.quality)*Math.max(.45,q),scale=Math.min(1,limit/Math.max(width,height));
    const cw=Math.max(1,Math.round(width*scale)),ch=Math.max(1,Math.round(height*scale));
    if(!frame||cw!==canvas.width||ch!==canvas.height){canvas.width=cw;canvas.height=ch;frame=ctx.createImageData(cw,ch);}
  }
  function setOptions(next){options=next;for(const key of ['color','color2','background','waterColor','skyColor','horizonColor','sunColor'])colors[key]=colorRGB(options[key]||'#ffffff');canvas.style.opacity=String(options.opacity);resize(width,height);}
  function render(time){
    if(disposed)return;
    const w=canvas.width,h=canvas.height,data=frame.data,aspect=width/height;
    const positions=[],seaOptions=effect==='sea'?{...options,detail:3}:null;
    if(effect==='art'&&options.kind==='metaballs'&&bodies)for(let i=0;i<options.amount;i++){const k=i*4,projection=1.4/(3.5-bodies[k+2]);positions.push([bodies[k]*projection,bodies[k+1]*projection,bodies[k+3]*projection]);}
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const u=(x+.5)/w,v=1-(y+.5)/h,p=(u-.5)*aspect,q=v-.5,index=(y*w+x)*4;
      let red,green,blue,alpha=1;
      if(effect==='sea'){
        const horizon=options.horizon,sunX=.5+options.sunAzimuth/(aspect*2),sunY=horizon+options.sunElevation*.55;
        let blend=clamp((v-horizon)/Math.max(.1,1-horizon)),baseA=colors.horizonColor,baseB=colors.skyColor;
        if(v<horizon){
          const depth=(horizon-v)/Math.max(.1,horizon),distance=Math.min(400,2.3/Math.max(.008,horizon-v));
          const worldX=p*distance/1.12,worldZ=distance;
          const surface=seaSurface(worldX,worldZ,time,seaOptions,distance);
          const nlen=Math.hypot(surface.dx,1,surface.dz),normalX=-surface.dx/nlen,normalZ=-surface.dz/nlen;
          const reflection=Math.exp(-Math.abs(u-sunX+normalX*.22)*((10+depth*12)/Math.max(.15,options.reflection)))*
            (.2+.8*Math.max(0,1-Math.abs(normalZ+.13-depth*.10)*6)**8);
          blend=clamp(depth*.8);baseA=colors.horizonColor;baseB=colors.waterColor;
          const shade=clamp(.83+normalZ*.32-normalX*.20,.5,1.15);
          red=(baseA[0]*(1-blend)+baseB[0]*blend)*shade+colors.sunColor[0]*reflection*.35;
          green=(baseA[1]*(1-blend)+baseB[1]*blend)*shade+colors.sunColor[1]*reflection*.35;
          blue=(baseA[2]*(1-blend)+baseB[2]*blend)*shade+colors.sunColor[2]*reflection*.35;
        }else{
          red=baseA[0]*(1-blend)+baseB[0]*blend;green=baseA[1]*(1-blend)+baseB[1]*blend;blue=baseA[2]*(1-blend)+baseB[2]*blend;
          const distance=Math.hypot((u-sunX)*aspect,v-sunY),sun=(Math.exp(-distance*distance/Math.max(.0001,options.sunSize**2))*.7+Math.exp(-distance*9)*.15);
          red+=colors.sunColor[0]*sun;green+=colors.sunColor[1]*sun;blue+=colors.sunColor[2]*sun;
        }
      }else{
        let light=0,hue=0,mask=1,px=p*options.scale,qy=q*options.scale;
        if(options.kind==='metaballs'){
          let density=0,gx=0,gy=0;
          for(let i=0;i<positions.length;i++){
            const ball=positions[i],dx=px-ball[0],dy=qy-ball[1],d=dx*dx+dy*dy+.002;
            density+=ball[2]*ball[2]/d;gx+=dx*ball[2]*ball[2]/(d*d);gy+=dy*ball[2]*ball[2]/(d*d);
          }
          mask=clamp((density-.9)*8);const n=Math.hypot(gx,gy,6);
          light=clamp(.35+.5*(-gx*.5+gy*.6+3)/n);light+=Math.exp(-((light-.6)**2)*90)*.45;hue=light;
        }else if(options.kind==='silk'){
          const fold=(px*.91+qy*.41)*options.amount+(qy*.91-px*.41)*1.4+Math.sin(qy*2+time*.16)*options.relief*2;
          light=.3+.16*Math.sin(fold)+Math.pow(Math.max(0,Math.cos(fold)*.8+.2),5)*.6;hue=light;
        }else if(options.kind==='interference'){
          const a=Math.hypot(px+.48,qy-.07),b=Math.hypot(px-(pointer.active?(pointer.x-.5)*aspect*options.scale:.48),qy-(pointer.active?(pointer.y-.5)*options.scale:-.07)),sum=Math.sin(a*options.amount*3-time*.45)+Math.sin(b*options.amount*3-time*.45);
          light=Math.abs(sum*.5)**3;hue=.5+.5*Math.sin((a-b)*8);mask=options.transparent?clamp(light+.12):1;
        }else{
          const r=Math.max(.018,Math.hypot(px,qy)),angle=Math.atan2(qy,px),travel=-Math.log(r);
          const line=(.5+.5*Math.cos((angle+travel*options.relief*.7-time*.12)*options.amount))**22,ring=(.5+.5*Math.cos(travel*12-time*.9))**28;
          light=(line*.5+ring*.6)*clamp((r-.02)/.1);hue=.5+.5*Math.sin(travel+angle);mask=options.transparent?clamp(light):1;
        }
        const c1=colors.color,c2=colors.color2,bg=colors.background;
        red=(c1[0]*(1-hue)+c2[0]*hue)*light;green=(c1[1]*(1-hue)+c2[1]*hue)*light;blue=(c1[2]*(1-hue)+c2[2]*hue)*light;
        if(options.transparent)alpha=mask;else{red=red*mask+bg[0]*(1-mask);green=green*mask+bg[1]*(1-mask);blue=blue*mask+bg[2]*(1-mask);}
      }
      data[index]=clamp(red)*255;data[index+1]=clamp(green)*255;data[index+2]=clamp(blue)*255;data[index+3]=clamp(alpha)*255;
    }
    ctx.putImageData(frame,0,0);
  }
  setOptions(input);
  return{canvas,get animated(){return options.fallbackAnimation!=='static';},resize,setOptions,render,setUniforms(values){bodies=values['uBodies[0]']??bodies;},setPointer(p){pointer=p;},getState(){return{fidelity:'Portable CPU approximation; not the GPU geometry',pixels:[canvas.width,canvas.height]};},destroy(){disposed=true;canvas.remove();canvas.width=canvas.height=1;frame=null;}};
}
