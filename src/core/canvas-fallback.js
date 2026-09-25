import {decorate,colorRGB,mulberry32} from './utils.js';

// === BOUNDED SOFTWARE RENDERING FOR DEVICES WITHOUT WORKING WEBGL ===
// These are animated visual approximations, not CPU copies of the volumetric shaders.
export function createCanvasFallback(mount,effect,input,onState=()=>{}){
  let options=input,width=1,height=1,hostWidth=1,hostHeight=1,padding=0,radius=0,quality=1,disposed=false,source=null,sourceRevision=0,sourceAbort=null,videoTime=-1,texture=null,frame=null;
  let pointer={x:.5,y:.5,active:false},colors={},seed=null,noiseTable=new Float32Array(16384);
  const canvas=decorate(document.createElement('canvas'),{position:'absolute',inset:'0',width:'100%',height:'100%',borderRadius:'inherit',pointerEvents:'none'});
  const ctx=canvas.getContext('2d',{alpha:true});if(!ctx)throw new Error('Canvas 2D is unavailable.');
  const staging=document.createElement('canvas'),textureContext=staging.getContext('2d',{willReadFrequently:true});mount.append(canvas);
  const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
  const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
  const fract=x=>x-Math.floor(x);
  function noise(x,y){const ix=Math.floor(x),iy=Math.floor(y);let fx=x-ix,fy=y-iy;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);const i=(iy&127)*128,j=((iy+1)&127)*128,a=noiseTable[i+(ix&127)],b=noiseTable[i+((ix+1)&127)],c=noiseTable[j+(ix&127)],d=noiseTable[j+((ix+1)&127)];return a+(b-a)*fx+(c-a)*fy+(a-b-c+d)*fx*fy;}
  const fbm=(x,y)=>noise(x,y)*.57+noise(x*2.07+17,y*2.03+31)*.28+noise(x*4.31+7,y*4.09+11)*.15;
  function setOptions(next){
    options=next;if(seed!==options.seed){seed=options.seed;const random=mulberry32(seed);for(let i=0;i<noiseTable.length;i++)noiseTable[i]=random();}
    for(const key of ['color','color2','color3','midColor','coreColor','topColor','tint','highlight','shadowColor','skyColor'])colors[key]=colorRGB(options[key]||'#ffffff');
    canvas.style.opacity=String(options.opacity);resize(width,height,quality,{hostWidth,hostHeight,padding,radius});
  }
  function resize(w,h,q=quality,layout={}){
    width=Math.max(1,w);height=Math.max(1,h);quality=q;hostWidth=layout.hostWidth??width;hostHeight=layout.hostHeight??height;padding=layout.padding??0;radius=layout.radius??0;
    const maxSide=Math.max(80,Math.round((effect==='field'&&options.kind==='rain'?1100:256)*Math.sqrt(options.quality)*Math.max(.4,quality))),scale=Math.min(1,maxSide/Math.max(width,height));
    const cw=Math.max(1,Math.round(width*scale)),ch=Math.max(1,Math.round(height*scale));
    if(!frame||cw!==canvas.width||ch!==canvas.height){canvas.width=cw;canvas.height=ch;frame=ctx.createImageData(cw,ch);}
  }
  function refreshSource(){
    if(!source||disposed)return;const w=source.videoWidth||source.naturalWidth||source.width,h=source.videoHeight||source.naturalHeight||source.height;if(!w||!h)return;
    const scale=Math.min(1,512/Math.max(w,h)),sw=Math.max(1,Math.round(w*scale)),sh=Math.max(1,Math.round(h*scale));
    if(staging.width!==sw||staging.height!==sh){staging.width=sw;staging.height=sh;}
    textureContext.clearRect(0,0,sw,sh);textureContext.drawImage(source,0,0,sw,sh);
    texture=textureContext.getImageData(0,0,sw,sh);videoTime=source.currentTime??-1;
  }
  async function setSource(next){
    const revision=++sourceRevision;sourceAbort?.abort();sourceAbort=new AbortController();const signal=sourceAbort.signal;
    if(!next){source=null;texture=null;return;}let image=next;
    if(typeof next==='string'){
      const url=new URL(next,document.baseURI);if(!['http:','https:','data:','blob:','file:'].includes(url.protocol))throw new TypeError('Unsupported texture URL protocol.');
      image=new Image();if(/^https?:$/.test(url.protocol))image.crossOrigin='anonymous';
      image.src=url.href;
    }
    if((image.tagName==='IMG'&&(!image.complete||!image.naturalWidth))||(image.tagName==='VIDEO'&&image.readyState<2)){
      await new Promise((resolve,reject)=>{
        const event=image.tagName==='VIDEO'?'loadeddata':'load';let finished=false;
        const finish=error=>{if(finished)return;finished=true;clearTimeout(timer);image.removeEventListener(event,ready);image.removeEventListener('error',failed);signal.removeEventListener('abort',cancel);error?reject(error):resolve();};
        const ready=()=>finish(),failed=()=>finish(new Error('Portable texture loading failed. Check the URL and CORS permissions.')),cancel=()=>finish();
        const timer=setTimeout(()=>finish(new Error('Texture loading timed out.')),30000);image.addEventListener(event,ready);image.addEventListener('error',failed);signal.addEventListener('abort',cancel,{once:true});if(signal.aborted)cancel();
      });
    }
    if(disposed||revision!==sourceRevision)return;
    const previous=source;source=image;try{refreshSource();}catch(error){source=previous;throw new Error('Cannot read water source pixels. Use a same-origin or CORS-enabled image. '+error.message);}
  }
  function sampleTexture(u,v,out){
    if(!texture){out[0]=colors.tint[0]*.48;out[1]=colors.tint[1]*.48;out[2]=colors.tint[2]*.48;return;}
    const w=texture.width,h=texture.height,ratio=(hostWidth/hostHeight)/(w/h);
    u=(u-.5)*Math.min(1,ratio)+.5;v=(v-.5)*Math.min(1,1/ratio)+.5;
    const x=clamp(u)*(w-1),y=clamp(v)*(h-1),ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
    const a=(iy*w+ix)*4,b=(iy*w+Math.min(w-1,ix+1))*4,c=(Math.min(h-1,iy+1)*w+ix)*4,d=(Math.min(h-1,iy+1)*w+Math.min(w-1,ix+1))*4,data=texture.data;
    for(let k=0;k<3;k++)out[k]=((data[a+k]*(1-fx)+data[b+k]*fx)*(1-fy)+(data[c+k]*(1-fx)+data[d+k]*fx)*fy)/255;
  }
  function water(u,v,t,out){
    const scale=options.scale*2.5,flow=t*options.flowSpeed,evolve=t*options.morphSpeed;
    const x=u*scale-flow*options.windX,y=v*scale-flow*options.windY;
    const a=x*1.8+y*.5+evolve*.53,b=y*2.2-x*.6-evolve*.37,c=(x+y)*2.8+Math.sin(x-y+evolve*.21);
    const nx=Math.cos(a)*.65-Math.cos(b)*.3+Math.cos(c)*.25,ny=Math.cos(b)*.65+Math.cos(a)*.3+Math.cos(c)*.25;
    sampleTexture(u+nx*options.distortion*2,v+ny*options.distortion*2,out);
    const ridge=Math.pow(clamp(1-Math.abs(Math.sin(a+Math.sin(b)*1.1+Math.sin(c)*.28))),Math.max(.5,options.ridge)*2.5);
    for(let k=0;k<3;k++)out[k]=out[k]*(1-options.tintOpacity)+colors.tint[k]*options.tintOpacity+colors.highlight[k]*ridge*options.caustic*.7;
    out[3]=1;
  }
  function aurora(u,v,t,out){
    const sky=1-v;out[0]=.004+sky*.008;out[1]=.009+sky*.016;out[2]=.025+sky*.026;
    for(let layer=0;layer<3;layer++){
      const x=u*5.5+layer*9+t*options.auroraSpeed*.18;
      const base=.48+layer*.13+Math.sin(x*.9+t*.09)*.13+Math.sin(x*1.7-t*.11)*.035;
      const rise=base-v,edge=Math.exp(-Math.abs(rise)*36),tail=Math.exp(-Math.max(0,rise)*(7+layer))*smooth(-.015,.025,rise);
      const rays=.24+.76*noise(x*11+Math.sin(t*.08+x),v*.7+layer*31),luminance=(edge*.55+tail*.28)*rays*(.9+Math.sin(t*options.breathSpeed)*options.breath);
      const mix=clamp(rise*3.8+options.proportion*.32);
      for(let k=0;k<3;k++)out[k]+=(colors.color[k]*(1-mix)+colors.topColor[k]*mix)*luminance;
    }
    const sx=Math.floor(u*160),sy=Math.floor(v*100),n=noiseTable[(sy&127)*128+(sx&127)];
    if(n>.994&&v<.6){const star=Math.pow(clamp(1-Math.hypot(fract(u*160)-.5,fract(v*100)-.5)*2.5),2)*options.stars;for(let k=0;k<3;k++)out[k]+=star;}
    out[3]=1;
  }
  function fire(u,v,time,out){
    const t=time*options.flameSpeed,ft=time*options.flickerSpeed;
    let X=u*width-padding,Y=(1-v)*height-padding,px,py,breadth;
    const outside=options.mode==='out',reach=outside?options.reach:hostHeight;
    const qx=Math.abs(X-hostWidth*.5)-hostWidth*.5+radius,qy=Math.abs(Y-hostHeight*.5)-hostHeight*.5+radius;
    const sd=Math.hypot(Math.max(qx,0),Math.max(qy,0))+Math.min(Math.max(qx,qy),0)-radius;
    if(outside){borderFire(X,Y,t,ft,sd,out);return;}
    if(outside&&options.direction==='outward'){
      py=Math.max(0,sd)/reach;px=(Math.abs(X-hostWidth*.5)>Math.abs(Y-hostHeight*.5)?Y+hostWidth:X)/reach;breadth=2;
      py=Math.max(0,py-options.gravity*py*py*.12*(Y>hostHeight*.5?1:-1));
    }else{
      let dir=options.direction==='right'?1:options.direction==='down'?2:options.direction==='left'?3:0;
      let edge=['top','right','bottom','left'].indexOf(options.sourceEdge);if(edge<0)edge=dir;
      const ox=outside?(edge===1?hostWidth:edge===3?0:hostWidth*.5):(dir===1?0:dir===3?hostWidth:hostWidth*.5);
      const oy=outside?(edge===0?hostHeight:edge===2?0:hostHeight*.5):(dir===0?0:dir===2?hostHeight:hostHeight*.5);
      const length=outside?reach:(dir%2?hostWidth:hostHeight);
      py=(dir===0?Y-oy:dir===1?X-ox:dir===2?oy-Y:ox-X)/length;
      if(dir%2)Y-=(options.respectGravity?options.gravity:0)*Math.max(0,py)**2*length*.6;
      px=(dir===0?X-ox:dir===1?oy-Y:dir===2?ox-X:Y-oy)/length;breadth=(dir%2?hostHeight:hostWidth)/length;
    }
    px-=(options.sourceOffset-.5)*breadth;
    if(py<0||py>1.65){out[3]=0;return;}
    const perimeter=outside&&options.direction==='outward',drift=py*py*options.wind*.26;
    let body,hot;
    if(options.model==='candle'&&!perimeter){
      const y=py/options.height,cx=px-drift-Math.sin(ft*1.9)*.018*options.turbulence*y*y;
      const w=Math.max(.007,breadth*options.spread*.3)*Math.max(0,Math.sin(clamp(y)*Math.PI))**.75*(1-y*.5),q=Math.abs(cx)/Math.max(.001,w);
      body=(1-smooth(.6,1.2,q))*smooth(0,.025,y)*(1-smooth(.92,1,y));hot=clamp(.25+Math.exp(-((q-.62)**2)*9)*.65+(1-y)*.2);
      const fuel=(1-smooth(.04,.2,y))*(1-smooth(.05,.5,q));body*=1-fuel*.9;
    }else{
      const x=(px-drift)*options.scale*1.3,ay=py*4-t*1.5,curl=(noise(x*.6+11,ay*.7)-.5)*options.turbulence*2;
      const n=fbm(x+curl,ay),top=(.3+.8*noise(x*.7,ft*.45))*options.height;
      const heat=(top-py+(n-.47)*options.turbulence*.95)/Math.max(.1,options.height);
      const envelope=perimeter?1:1-smooth(options.spread*.24,options.spread*.53,Math.abs(px/breadth-drift));
      body=smooth(-.07,.2,heat)*envelope;hot=clamp(heat*2.3);
      if(options.model==='ribbon'){const folds=.5+.5*Math.sin(x*2.8+ay+curl*2.5);body*=.48+.48*folds;hot*=.43+.24*folds;}
      if(options.model==='embers'){const coal=noise(x*4,py*32),edge=Math.exp(-Math.abs(coal-.49)*22);hot=(.25+edge*.45)*(.6+.4*noise(x*3,ft*.35));body=(.5+edge*.5)*Math.exp(-py*26)*(1-smooth(options.spread*.44,options.spread*.5,Math.abs(px/Math.max(breadth,.001))));}
    }
    const middle=smooth(.02,.55,hot),core=hot**3*.72;
    for(let k=0;k<3;k++)out[k]=(colors.color[k]*(1-middle)+colors.midColor[k]*middle)*(1-core)+colors.coreColor[k]*core;
    if(options.model==='candle'&&py<.11){const blue=Math.exp(-(((py-.035)*30)**2))*options.blueBase;for(let k=0;k<3;k++)out[k]=out[k]*(1-blue)+[.07,.2,1][k]*blue;}
    out[3]=clamp(body*options.intensity)*(1-smooth(1.25,1.6,py));
    if(options.embers>0){const ex=px*39+Math.sin(py*5-t)*.4,ey=py*17-t*1.7,ix=Math.floor(ex),iy=Math.floor(ey),n=noiseTable[(iy&127)*128+(ix&127)];
      if(n>1-options.embers*.04){const a=(1-smooth(.015,.12,Math.hypot(fract(ex)-.5,(fract(ey)-.5)*.42)))*smooth(.03,.15,py)*(1-smooth(.7,1.3,py));if(a>out[3]){out[3]=a;for(let k=0;k<3;k++)out[k]=colors.coreColor[k];}}
    }
  }
  function borderFire(X,Y,t,ft,sd,out){
    if(options.outPolicy==='strict'&&sd<0){out[3]=0;return;}
    const reach=options.reach,maxAge=Math.max(.18,options.height*1.45),steps=9,da=maxAge/steps,band0=Math.max(3,reach*da*1.12);
    const gravity=options.respectGravity?options.gravity:0,direction=['up','right','down','left','outward'].indexOf(options.direction);
    const edge=options.sourceEdge==='all'?5:options.sourceEdge==='auto'?(direction===4?5:direction+1):['','top','right','bottom','left'].indexOf(options.sourceEdge);
    let total=0,red=0,green=0,blue=0;
    for(let j=0;j<steps;j++){
      const age=(j+.5)*da,dy=gravity*.6*age*age*reach;
      let dx=direction===1?1:direction===3?-1:0,vy=direction===0?1:direction===2?-1:0;
      let bx=X-dx*age*reach-options.wind*.28*age*age*reach,by=Y-vy*age*reach-dy;
      if(direction===4){
        const cx=X-hostWidth*.5,cy=Y-dy-hostHeight*.5,qx=Math.abs(cx)-hostWidth*.5+radius,qy=Math.abs(cy)-hostHeight*.5+radius;
        if(Math.max(qx,qy)<0){dx=qx>qy?Math.sign(cx):0;vy=qx>qy?0:Math.sign(cy);}
        else{const length=Math.hypot(Math.max(qx,0)+.001,Math.max(qy,0)+.001);dx=(Math.max(qx,0)+.001)/length*Math.sign(cx);vy=(Math.max(qy,0)+.001)/length*Math.sign(cy);}
        bx=X-dx*age*reach-options.wind*.28*age*age*reach;by=Y-vy*age*reach-dy;
      }
      const cx=bx-hostWidth*.5,cy=by-hostHeight*.5,qx=Math.abs(cx)-hostWidth*.5+radius,qy=Math.abs(cy)-hostHeight*.5+radius;
      const dist=Math.hypot(Math.max(qx,0),Math.max(qy,0))+Math.min(Math.max(qx,qy),0)-radius,band=band0*(1+gravity*age*1.2)+age*reach*.045*options.turbulence;
      if(Math.abs(dist)>band*1.5)continue;
      let nx,ny;if(Math.max(qx,qy)<0){nx=qx>qy?Math.sign(cx):0;ny=qx>qy?0:Math.sign(cy);}else{const l=Math.hypot(Math.max(qx,0)+.001,Math.max(qy,0)+.001);nx=(Math.max(qx,0)+.001)/l*Math.sign(cx);ny=(Math.max(qy,0)+.001)/l*Math.sign(cy);}
      let gate=edge===5?1:smooth(.05,.45,edge===1?ny:edge===2?nx:edge===3?-ny:-nx);
      const ax=bx-nx*dist,ay=by-ny*dist,lane=Math.abs(ny)>.55?ax:hostHeight-ay,span=Math.abs(ny)>.55?hostWidth:hostHeight;
      if(options.spread<1||Math.abs(options.sourceOffset-.5)>.001)gate*=1-smooth(options.spread*.44,options.spread*.5,Math.abs(lane/span-options.sourceOffset));
      const jitter=noise(ax*.036+options.seed*.1,ay*.036+ft*.45),top=options.height*(.45+.58*jitter);
      const advx=ax/reach*options.scale*.7+.37*(age*3-t*1.55),advy=ay/reach*options.scale*.7+age*3-t*1.55,curl=noise(advx*.7+ax*.008,advy*.7+ay*.008)*2-1,n=noise(advx+curl*options.turbulence*1.2,advy+options.seed*.13);
      let body=Math.exp(-((dist/band)**2)*2)*gate*(1-smooth(top*.60,top*1.2,age)),hot=clamp(.62-age/Math.max(top,.01)*.42+(n-.5)*.32);
      if(options.model==='ribbon'){body*=.48+.52*n;hot*=.78;}
      else if(options.model==='candle'){const phase=fract(lane/Math.max(reach*.22,16))-.5;body*=Math.exp(-phase*phase*45/Math.max(.12,1-age/top));}
      else if(options.model==='embers'){body*=Math.exp(-age*25);hot*=.8;}
      const mix=smooth(.08,.7,hot),core=hot**4*(options.model==='ribbon'?.22:.65),alpha=clamp(body*(.4+n*.6)*options.intensity*.78,0,.82),a=alpha*(1-total);
      red+=((colors.color[0]*(1-mix)+colors.midColor[0]*mix)*(1-core)+colors.coreColor[0]*core)*a;
      green+=((colors.color[1]*(1-mix)+colors.midColor[1]*mix)*(1-core)+colors.coreColor[1]*core)*a;
      blue+=((colors.color[2]*(1-mix)+colors.midColor[2]*mix)*(1-core)+colors.coreColor[2]*core)*a;total+=a;
    }
    out[0]=red/Math.max(total,.001);out[1]=green/Math.max(total,.001);out[2]=blue/Math.max(total,.001);out[3]=total*(options.outPolicy==='strict'?smooth(-.5,1,sd):1);
  }
  function atmosphere(u,v,t,out){
    if(effect==='clouds'){
      const x=u*options.scale*2-t*options.wind*.2,y=v*options.scale*2,n=fbm(x,y),density=smooth(1-options.coverage-.13,1-options.coverage+options.softness,n)*options.density;
      const shade=clamp(.68+(n-fbm(x-.035,y-.06))*options.light*4.5),a=clamp(density);
      for(let k=0;k<3;k++){const c=colors.shadowColor[k]*(1-shade)+colors.color[k]*shade;out[k]=options.transparent?c:colors.skyColor[k]*(1-a)+c*a;}out[3]=options.transparent?a:1;return;
    }
    const rise=1-v,x=(u-.5-options.wind*rise*.22)/(options.spread*(.22+rise*.8)),y=rise*options.scale-t*options.rise;
    const local=pointer.active?Math.exp(-((u-pointer.x)**2+(1-v-pointer.y)**2)*24):0;
    const curl=(fbm(x*.8+5,y*.8)-.5)*options.turbulence+local*Math.sin(y*3+t*.5)*.3;
    const n=fbm(x*2+curl*2,y*1.6),envelope=Math.exp(-x*x*(1.8+v))*smooth(0,.13,rise)*(1-smooth(.82,1.04,rise));
    const alpha=clamp((n-.2)*2*envelope*options.density),light=clamp(.58+(n-fbm(x*2+curl*2-.06,y*1.6-.08))*options.light*3.5,.15,1.15);
    for(let k=0;k<3;k++)out[k]=colors.color[k]*light;out[3]=alpha;
  }
  function field(u,v,t,out){
    const s=options.scale,x=u*s,y=v*s,n=fbm(x+t*options.wind*.1,y-t*.08);let f=n,alpha=1;
    if(options.kind==='rain'){
      const cx=u*80*options.scale/4,cy=v*8+t*(1.7+noise(Math.floor(cx),5)),column=Math.floor(cx),jitter=noise(column,3),drop=fract(cy+jitter*7);
      f=(1-smooth(.025,.18,Math.abs(fract(cx)-.5)))*smooth(.68,.96,drop)*(1-smooth(.96,1,drop));alpha=options.transparent?f:1;
    }else if(options.kind==='lava'){const crust=Math.abs(Math.sin((x+y)*2+(n-.5)*options.distortion*12));f=Math.exp(-crust*22)*options.intensity;}
    else if(options.kind==='ocean'){const waves=Math.sin(x*1.5+t*.7+Math.sin(y*.7-t*.2)*.5)+.4*Math.sin(x*2.7-y*1.7-t*.6)+.2*Math.sin(y*3.4+x*.9+t);f=clamp(.4+(waves*.16+Math.exp(-Math.abs(waves-.8)*4)*.2)*options.oceanAmplitude);}
    else if(options.kind==='magnetic'){const d=Math.hypot(u-(pointer.active?pointer.x:.5),v-(pointer.active?1-pointer.y:.5));f=Math.pow(.5+.5*Math.sin(d*s*30+n*options.distortion*8-t),10);}
    else if(options.kind==='nebula'){f=smooth(.33,.75,n);alpha=options.transparent?f:1;}
    else if(options.kind==='iridescence'){const h=(x+y)*1.6+n*options.distortion*6+t*.35;out[0]=.5+.5*Math.sin(h);out[1]=.5+.5*Math.sin(h+2.1);out[2]=.5+.5*Math.sin(h+4.2);out[3]=1;return;}
    for(let k=0;k<3;k++)out[k]=(colors.color[k]*(1-clamp(f))+colors.color2[k]*clamp(f))*options.intensity;
    out[3]=alpha;
  }
  function renderRain(t){
    const sx=canvas.width/width,sy=canvas.height/height;ctx.setTransform(sx,0,0,sy,0,0);ctx.clearRect(0,0,width,height);
    if(!options.transparent){ctx.fillStyle=`rgb(${colors.color.map(v=>v*36).join(' ')})`;ctx.fillRect(0,0,width,height);}
    ctx.strokeStyle=options.color2;ctx.lineCap='round';
    for(let layer=0;layer<3;layer++){
      const spacing=(24+layer*16)/Math.max(.08,options.rainDensity)*4/Math.max(.4,options.scale),drift=t*options.wind*(20+layer*12);
      const start=Math.floor(-drift/spacing)-2,end=Math.ceil((width-drift)/spacing)+2;
      for(let column=start;column<=end;column++){
        const r=noiseTable[((column+options.seed)&127)+(layer+17)*128],r2=noiseTable[((column+83)&127)+(layer+41)*128];
        const length=options.rainLength*(.6+.7*r)*(1+layer*.2),velocity=(100+170*r)*(1+layer*.3);
        const x=(column+.14+.72*r2)*spacing+drift,y=((t*velocity+r2*(height+2*length))%(height+2*length))-length;
        ctx.globalAlpha=(.24+layer*.13)*options.intensity;ctx.lineWidth=options.rainWidth*(.6+layer*.25);
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-options.wind*.32*length,y-length);ctx.stroke();
      }
    }
    ctx.globalAlpha=1;ctx.setTransform(1,0,0,1,0,0);
  }
  const sample=effect==='water'?water:effect==='fire'?fire:effect==='aurora'?aurora:effect==='field'?field:atmosphere,out=[0,0,0,0];
  function render(t){
    if(disposed)return;
    if(effect==='field'&&options.kind==='rain'){renderRain(t);return;}
    if(source?.tagName==='VIDEO'&&source.readyState>=2&&source.currentTime!==videoTime){try{refreshSource();}catch(error){videoTime=source.currentTime;onState('error',error.message);source=null;}}
    const w=canvas.width,h=canvas.height,data=frame.data;for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      sample((x+.5)/w,(y+.5)/h,t,out);const i=(y*w+x)*4;
      data[i]=clamp(out[0])*255;data[i+1]=clamp(out[1])*255;data[i+2]=clamp(out[2])*255;data[i+3]=clamp(out[3])*255;
    }ctx.putImageData(frame,0,0);
  }
  setOptions(options);
  return{canvas,get maxFPS(){return options.fallbackFPS;},get animated(){return options.fallbackAnimation!=='static';},setOptions,resize,render,setSource,refreshSource,setPointer(p){pointer=p||{x:.5,y:.5,active:false};},getState(){return{backend:'Canvas 2D fallback',pixels:[canvas.width,canvas.height],fidelity:'Animated approximation; not the WebGL shader',sourcePixels:texture?[texture.width,texture.height]:null,...(effect==='fire'?{sourceEdges:options.sourceEdge,fireVisibility:options.mode==='out'?options.outPolicy:'inside',gravityEnabled:options.respectGravity}:{} )};},destroy(){if(disposed)return;disposed=true;sourceRevision++;sourceAbort?.abort();source=null;texture=null;frame=null;noiseTable=null;canvas.remove();canvas.width=canvas.height=staging.width=staging.height=1;}};
}
