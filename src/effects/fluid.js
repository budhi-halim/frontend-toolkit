import {FluidDevice} from '../core/fluid-device.js';
import {CpuFluid} from '../core/fluid-cpu.js';
import {normalizeOptions} from '../core/schema.js';
import {colorRGB} from '../core/utils.js';

// === INTERACTIVE FLUID, WITH CAPABILITY-BASED FALLBACK ===
export function createFluidRenderer(mount,input={},onState=()=>{}){
  let options=normalizeOptions('fluid',input),gpu=null,cpu=null,failure='',width=1,height=1,lastTime=null,disposed=false,attempted=false,quality={scale:1,iterations:1,name:'Full'},pointer=null,queued=[],lastGrid='',lastLayout='',color=colorRGB(options.color);
  function backend(){return gpu&&!gpu.lost?gpu:cpu;}
  function setup(){
    if(!gpu&&!attempted&&!options.forceFallback){attempted=true;try{gpu=new FluidDevice(mount,(status,message)=>{if(disposed)return;if(status==='context-lost'||status==='error'){failure=message;ensureCPU();}else if(status==='restored'){cpu?.destroy();cpu=null;lastGrid='';lastLayout='';resize();}onState(status,message);});}catch(error){failure=error.message;onState('fallback',failure+' Portable CPU fluid solver selected.');}}
    if(!gpu||gpu.lost||options.forceFallback)ensureCPU();
  }
  function ensureCPU(){if(!cpu){cpu=new CpuFluid(mount);lastGrid='';lastLayout='';resize();}}
  function effective(){return{...options,pressureIterations:Math.max(6,Math.round(options.pressureIterations*quality.iterations))};}
  function resize(){
    if(disposed)return;const device=backend();if(!device)return;
    const maximum=Math.max(32,Math.round((device===cpu?Math.min(80,options.resolution*.5):options.resolution)*quality.scale/8)*8),aspect=width/Math.max(1,height),w=Math.max(16,Math.round(aspect>=1?maximum:maximum*aspect)),h=Math.max(16,Math.round(aspect>=1?maximum/aspect:maximum));
    const grid=[w,h].join(',');if(grid!==lastGrid){device.resizeGrid(w,h);lastGrid=grid;}
    const scale=Math.min(globalThis.devicePixelRatio||1,options.dprCap)*options.quality*quality.scale,reduction=Math.min(1,2048/(width*scale),2048/(height*scale));
    const cw=Math.max(1,Math.round(width*scale*reduction)),ch=Math.max(1,Math.round(height*scale*reduction)),layout=[cw,ch].join(',');if(layout!==lastLayout){device.resizeCanvas(cw,ch);lastLayout=layout;}device.canvas.style.opacity=String(options.opacity);
  }
  function dye(t){if(options.kind==='fire')return[1.4,.62,.12];return options.rainbow?[.65+.55*Math.sin(t*.65),.65+.55*Math.sin(t*.65+2.094),.65+.55*Math.sin(t*.65+4.188)]:color.map(x=>x*1.4);}
  function inject(device,x,y,dx,dy,t,amount=1){device.splat(Math.max(.01,Math.min(.99,x)),Math.max(.01,Math.min(.99,y)),Math.max(-3,Math.min(3,dx)),Math.max(-3,Math.min(3,dy)),dye(t).map(v=>v*amount),options.radius,width/Math.max(1,height));}
  setup();resize();
  return{
    releasable:true,get animated(){return Boolean(backend())&&(backend()!==cpu||options.fallbackAnimation!=='static');},get maxFPS(){return backend()===cpu?options.fallbackFPS:null;},get canvas(){return backend()?.canvas??null;},
    setOptions(next){const old=options;options=normalizeOptions('fluid',next,options);color=colorRGB(options.color);if(options.forceFallback&&gpu){gpu.destroy();gpu=null;lastGrid='';lastLayout='';}if(old.forceFallback&&!options.forceFallback){attempted=false;if(cpu){cpu.destroy();cpu=null;}lastGrid='';lastLayout='';}if(!options.interactive){pointer=null;queued=[];}setup();resize();},
    setQuality(next){const changed=Math.abs(next.scale-quality.scale)>.08;quality=next;if(changed)resize();},resize(w,h){width=w;height=h;resize();},
    setPointer(p){if(!options.interactive)return;pointer=p;if(p.active&&((Math.abs(p.dx)+Math.abs(p.dy)>.00001)||p.down)){queued.push({...p});if(queued.length>12)queued.shift();}},
    render(time){
      const device=backend();if(!device)return;if(lastTime!==null&&time<lastTime)device.clear();const elapsed=lastTime===null?1/60:Math.max(0,Math.min(.05,time-lastTime));lastTime=time;
      if(elapsed>0){
        for(const p of queued){inject(device,p.x,p.y,p.dx*options.force,p.dy*options.force,time,.55);}queued=[];
        const steps=Math.max(1,Math.ceil(elapsed/(1/60))),dt=elapsed/steps;
        for(let i=0;i<steps;i++){
          if(options.autoEmit){
            if(options.kind==='fire'){for(let j=0;j<3;j++){const phase=time*1.7+j*2.1;inject(device,.5+(j-1)*.072+Math.sin(phase)*.018,.055+Math.cos(phase*.8)*.009,Math.sin(phase)*.018,.38+Math.sin(phase+1)*.10,time,dt*(3.6+Math.sin(phase)*.7));}}
            else if(options.kind==='smoke')inject(device,.5+Math.sin(time*.8)*.12,.075,Math.cos(time*.8)*.06,.3,time,dt*15);
            else{const a=time*.8;inject(device,.5+Math.cos(a)*.23,.5+Math.sin(a*1.3)*.2,-Math.sin(a)*.24,Math.cos(a*1.3)*.25,time,dt*16);}
          }
          device.step(dt,effective());
        }
      }
      device.display(options,color);
    },
    clear(){backend()?.clear();queued=[];lastTime=null;},
    suspendInput(){pointer=null;queued=[];},
    getState(){return{backend:gpu&&!gpu.lost?'WebGL 2 fluid':'CPU fluid fallback',reason:options.forceFallback?'Portable solver selected':failure,simulationGrid:lastGrid,qualityLevel:quality.name,pressureIterations:gpu&&!gpu.lost?effective().pressureIterations:Math.min(18,effective().pressureIterations),pixels:backend()?[backend().canvas.width,backend().canvas.height]:null};},
    destroy(){if(disposed)return;disposed=true;gpu?.destroy();cpu?.destroy();gpu=cpu=null;queued=[];pointer=null;}
  };
}
