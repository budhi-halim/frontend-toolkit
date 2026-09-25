import {GLDevice} from '../core/gl.js';
import {createCanvasFallback} from '../core/canvas-fallback.js';
import {normalizeOptions} from '../core/schema.js';
import {decorate} from '../core/utils.js';
import {borderRadiusPixels} from '../core/geometry.js';
import {allowsPointer,automaticMotion,cleanPointer} from '../core/interaction.js';

// === GPU FIRST; LIVE SOFTWARE FALLBACK WITH THE SAME MANAGED CLOCK ===
export function createGpuRenderer(mount,fragment,initial,spec,onState=()=>{}){
  let options=normalizeOptions(spec.effect,initial),device=null,portable=null,failure='',attempted=false,destroyed=false;
  let source=null,sourceRevision=0,width=1,height=1,padding=0,renderScale=1,lastQuality=0,lastTime=0;
  let quality={level:0,name:'Full',scale:1,detail:1,particles:1,iterations:1};const smooth={scale:1,detail:1};
  const simulation=spec.simulation?.(options);
  const viewport=decorate(document.createElement('div'),{position:'absolute',inset:'0',borderRadius:'inherit',pointerEvents:'none'});
  const fallback=decorate(document.createElement('div'),{position:'absolute',inset:'0',borderRadius:'inherit',pointerEvents:'none'});viewport.append(fallback);mount.append(viewport);
  const gpuActive=()=>device&&!device.lost&&!options.forceFallback;
  const active=()=>gpuActive()?device:portable;
  function effective(){return spec.effective?spec.effective(options,smooth):options;}
  function uniforms(){return{...spec.uniforms(effective()),...simulation?.uniforms(),uHostSize:[width,height],uViewSize:[width+2*padding,height+2*padding],uPadding:padding,uRadius:borderRadiusPixels(mount,width,height)};}
  function initializeSource(target){
    if(!target)return;if(source)target.setSource(source).then(()=>{if(!destroyed&&target===active())onState('source-loaded');}).catch(e=>{if(!destroyed)onState('error',e.message);});
    else spec.init?.(target,options);
  }
  function layout(){
    simulation?.resize(width,height);padding=Math.max(0,spec.padding?.(options,width,height)||0);const w=width+2*padding,h=height+2*padding;
    Object.assign(viewport.style,{left:`${-padding}px`,top:`${-padding}px`,right:'auto',bottom:'auto',width:`${w}px`,height:`${h}px`,borderRadius:padding?'0':'inherit'});
    renderScale=Math.min(globalThis.devicePixelRatio||1,options.dprCap)*options.quality*smooth.scale;
    device?.resize(w,h,renderScale);device?.setUniforms(uniforms());portable?.resize(w,h,smooth.scale,{hostWidth:width,hostHeight:height,padding,radius:borderRadiusPixels(mount,width,height)});
  }
  function ensurePortable(){
    if(portable||destroyed)return;try{portable=spec.portable?spec.portable(viewport,options,onState):createCanvasFallback(viewport,spec.effect,options,onState);initializeSource(portable);portable.setUniforms?.(simulation?.uniforms()??{});fallback.style.display='none';layout();}
    catch(e){failure+='; '+e.message;portable=null;fallback.style.display='';onState('error',e.message);}
  }
  function setup(){
    if(destroyed)return;
    if(!device&&!options.forceFallback&&!attempted){attempted=true;
      try{
        device=new GLDevice(viewport,fragment,(state,message)=>{
          if(destroyed)return;
          if(state==='restored'){failure='';portable?.destroy();portable=null;fallback.style.display='none';layout();initializeSource(device);}
          else{failure=message||state;ensurePortable();}onState(state,message);
        });
        portable?.destroy();portable=null;fallback.style.display='none';device.canvas.style.opacity=String(options.opacity);device.setUniforms(uniforms());initializeSource(device);layout();
      }catch(e){failure=e.message;device?.destroy();device=null;ensurePortable();onState('fallback',`${failure} ${portable?'Animated Canvas fallback selected.':'Static CSS fallback selected.'}`);}
    }
    if(!gpuActive())ensurePortable();
  }
  const api={
    releasable:true,
    get animated(){return !(spec.effect==='fire'&&options.flameSpeed===0&&options.flickerSpeed===0)&&!spec.static&&Boolean(gpuActive()||portable?.animated)&&(simulation&&options.kind==='metaballs'?simulation.animated:automaticMotion(spec.effect,options));},
    get maxFPS(){return gpuActive()?null:options.fallbackFPS;},
    get canvas(){return active()?.canvas??null;},get device(){return device;},
    setOptions(next){
      const previous=options;options=normalizeOptions(spec.effect,next,options);simulation?.setOptions(options);fallback.style.background=spec.fallback(options);fallback.style.opacity=String(options.opacity);
      if(previous.forceFallback&&!options.forceFallback){attempted=false;failure='';}
      if(options.forceFallback&&device){device.destroy();device=null;}
      setup();portable?.setOptions(options);if(device)device.canvas.style.opacity=String(options.opacity);device?.setUniforms(uniforms());
      if(!allowsPointer(spec.effect,options)){device?.setUniforms({uPointer:[.5,.5,0],uPointerDelta:[0,0]});portable?.setPointer({x:.5,y:.5,active:false});}
      if(!source)spec.update?.(active(),options,previous);layout();
    },
    setQuality(next){
      quality=next;const now=performance.now(),dt=lastQuality?Math.min(100,now-lastQuality):16;lastQuality=now;const blend=1-Math.exp(-dt/450);
      smooth.scale+=(next.scale-smooth.scale)*blend;smooth.detail+=(next.detail-smooth.detail)*blend;
      if(Math.abs(Math.min(globalThis.devicePixelRatio||1,options.dprCap)*options.quality*smooth.scale-renderScale)>.045)layout();
      device?.setUniforms(spec.uniforms(effective()));
    },
    resize(w,h){width=w;height=h;layout();},
    render(time){
      lastTime=time;simulation?.step(time);const values=simulation?.uniforms();if(values){device?.setUniforms(values);portable?.setUniforms?.(values);}
      const t=(automaticMotion(spec.effect,options)?time:0)+(spec.seedTime?options.seed*.137:0);
      try{active()?.render(t);}catch(e){
        if(gpuActive()){failure=e.message;device.destroy();device=null;attempted=true;ensurePortable();onState('fallback',`GPU frame failed: ${failure}. Canvas fallback selected.`);portable?.render(t);}else throw e;
      }
    },
    setPointer(input){const p=cleanPointer(input);if(!allowsPointer(spec.effect,options))return;simulation?.setPointer(p);device?.setUniforms({uPointer:[p.x,p.y,p.active?1:0],uPointerDelta:[p.dx||0,p.dy||0]});portable?.setPointer(p);},
    clear(){simulation?.reset();},
    suspendInput(){simulation?.suspend();device?.setUniforms({uPointer:[.5,.5,0],uPointerDelta:[0,0]});portable?.setPointer?.({x:.5,y:.5,active:false});},
    async setSource(next){
      if(destroyed)throw new Error('The renderer has been destroyed.');const revision=++sourceRevision,previous=source;source=next||null;const target=active();
      if(!target){onState('source-pending','Texture retained for a working renderer.');return;}
      try{if(source)await target.setSource(source);else await spec.init?.(target,options);}catch(e){if(revision!==sourceRevision||destroyed)return;source=previous;throw e;}
      if(revision===sourceRevision&&!destroyed)onState('source-loaded');
    },
    refreshSource(){if(gpuActive()&&device.source)device.uploadSource(device.source);else portable?.refreshSource();onState('source-loaded');},
    getUniforms:uniforms,
    getState(){return{backend:gpuActive()?'WebGL':portable?'Canvas 2D fallback':'CSS fallback',reason:options.forceFallback?'Portable fallback explicitly selected':failure,pixels:active()?[active().canvas.width,active().canvas.height]:null,padding,qualityLevel:quality.name,effectiveScale:Number(renderScale.toFixed(3)),effectiveDetail:Number(smooth.detail.toFixed(3)),...simulation?.getState(),...(gpuActive()?{...(spec.stats?.(effective())||{}),...(device.getState?.()||{})}:portable?.getState()||{fidelity:'Static CSS only'})};},
    destroy(){if(destroyed)return;destroyed=true;sourceRevision++;source=null;device?.destroy();device=null;portable?.destroy();portable=null;viewport.remove();}
  };
  api.setOptions(initial);return api;
}
