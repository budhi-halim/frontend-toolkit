import {schedule} from './scheduler.js';
import {normalizeOptions} from './schema.js';
import {emit} from './utils.js';
import {resolveMotion,presentationOptions} from './motion.js';
import {recordDiagnostic} from './diagnostics.js';

// === MANAGED CLOCK, MOTION POLICY, VISIBILITY AND FAILURE RECOVERY ===
export function createController(host,mount,effect,factory,input={}){
  if(!host||!mount||typeof factory!=='function')throw new TypeError('A host, mount node and renderer factory are required.');
  let options=normalizeOptions(effect,input),renderer=null,disposed=false,initializing=false,visible=false,dirty=true,stop=null;
  let lastTick=null,time=0,frames=0,submitMs=0,lastEvent=0,lastFrameAt=0,lastMode='',fault='',sampleAt=0,sampleFrames=0,renderFPS=0;
  let width=1,height=1,releaseTimer=0,source=null,sourceRevision=0,error='',pointer=null,appliedMode='';
  const motion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')??{matches:false},started=performance.now();
  const presentation=()=>resolveMotion(effect,options,motion.matches);
  const motionBlocked=()=>!['full','subtle'].includes(presentation());
  const renderOptions=()=>presentationOptions(effect,options,presentation());
  function suspendInput(){pointer=null;renderer?.suspendInput?.();renderer?.setPointer?.({x:.5,y:.5,active:false,down:false,dx:0,dy:0,event:'pointercancel'});}
  function applyMotion(){
    const mode=presentation();if(mode!==appliedMode){suspendInput();appliedMode=mode;}mount.style.visibility=mode==='hide'?'hidden':'';
    if(mode==='hide'&&renderer){renderer.destroy();renderer=null;}else renderer?.setOptions(renderOptions());
    emit(host,'ft-motion',{effect,presentation:mode,reduced:mode!=='full'});
  }
  const running=()=>Boolean(renderer?.animated&&!fault&&!options.paused&&options.speed>0&&options.opacity>0&&!motionBlocked());
  const effectiveFPS=()=>Math.min(options.fps,renderer?.maxFPS||options.fps);
  function state(){
    if(disposed)return'disposed';if(fault)return fault;if(!visible)return'offscreen';if(document.hidden)return'document-hidden';
    if(motionBlocked())return'reduced-motion';if(!renderer)return'initializing';if(options.paused)return'paused';if(!renderer.animated)return'static';
    if(motionBlocked())return'reduced-motion';if(options.speed===0)return'speed-zero';if(options.opacity===0)return'opacity-zero';return'running';
  }
  const messages={'opacity-zero':'No rendering work while effect opacity is zero.','reduced-motion':'Reduced-motion presentation is active. The effect is calm, deliberately still, or suppressed; content stays usable. Enable animation only with an explicit preference.',paused:'Animation explicitly paused.',static:'Renderer is static or has no active simulation.',offscreen:'Paused outside the viewport.','document-hidden':'Paused while the browser tab is hidden.','speed-zero':'Playback speed is zero.',running:'Animation running.','initialization-error':'Renderer could not initialize. See error details; Retry renderer can try again.','render-error':'Frame rendering failed. See error details; Retry renderer can try again.'};
  function announce(){
    const next=state();if(next===lastMode||disposed)return;lastMode=next;
    if(next==='initializing')return;
    recordDiagnostic(next==='reduced-motion'?'warn':fault?'error':'info',next,messages[next]||next,{effect,element:host.id||host.localName,error:fault?error:undefined});
    emit(host,'ft-status',{effect,status:'animation-state',state:next,message:messages[next]||next});
  }
  function halt(){stop?.();stop=null;lastTick=null;sampleAt=0;sampleFrames=0;renderFPS=0;}
  function report(status,message){
    if(disposed)return;if(status==='error')error=message||'Renderer error';else if(status==='restored'||status==='source-loaded')error='';
    recordDiagnostic(status==='error'?'error':['fallback','context-lost'].includes(status)?'warn':'info',status,message||status,{effect,element:host.id||host.localName});
    emit(host,status==='error'?'ft-error':'ft-status',{effect,status,message});dirty=true;
    if(!initializing){halt();wake();announce();}
  }
  function initialize(){
    if(renderer||disposed||initializing||fault||presentation()==='hide')return;initializing=true;
    try{renderer=factory(mount,renderOptions(),report);renderer.resize(width,height);if(pointer)renderer.setPointer?.(pointer);
      if(source&&renderer.setSource)Promise.resolve(renderer.setSource(source)).catch(e=>report('error',e.message));
      emit(host,'ft-ready',{effect,...renderer.getState?.()});
    }catch(e){renderer?.destroy();renderer=null;error=e.message;fault='initialization-error';halt();recordDiagnostic('error',fault,error,{effect});emit(host,'ft-error',{effect,message:error});}
    finally{initializing=false;}
  }
  function wake(){
    if(disposed||initializing||fault||document.hidden||!visible)return;
    if((dirty||running())&&!stop)stop=schedule(tick,{adaptive:options.adaptive&&running()&&Boolean(renderer?.setQuality),targetFPS:effectiveFPS(),onError:e=>{stop=null;lastTick=null;fault='render-error';error=e.message;emit(host,'ft-error',{effect,message:error});announce();}});
  }
  function tick(now,quality){
    if(disposed||!visible||document.hidden){halt();return;}
    initialize();if(!renderer){halt();return;}
    const fps=effectiveFPS(),interval=1000/fps;
    if(!dirty&&lastTick!==null&&now-lastTick<interval-.6)return;
    const delta=lastTick!==null?Math.min(Math.max(0,(now-lastTick)/1000),Math.max(.25,1.5/fps)):0;lastTick=now;
    renderer.setQuality?.(options.adaptive?quality:{level:0,scale:1,detail:1,particles:1,iterations:1,name:'Manual'});
    if(running())time+=delta*options.speed*(presentation()==='subtle'?.15:1);
    const begin=performance.now();renderer.render(presentation()==='calm'?0:time);submitMs=performance.now()-begin;frames++;lastFrameAt=performance.now();dirty=false;
    if(!sampleAt){sampleAt=now;sampleFrames=0;}else sampleFrames++;
    if(now-sampleAt>=800){renderFPS=sampleFrames*1000/(now-sampleAt);sampleAt=now;sampleFrames=0;}
    announce();if(now-lastEvent>750){lastEvent=now;emit(host,'ft-stats',api.getStats());}
    if(!running())halt();
  }
  function resize(force=false){
    if(disposed)return;const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);
    if(force===true||w!==width||h!==height){width=w;height=h;renderer?.resize(width,height);dirty=true;}wake();
  }
  function release(){clearTimeout(releaseTimer);releaseTimer=0;if(!visible&&renderer?.releasable){renderer.destroy();renderer=null;emit(host,'ft-status',{effect,status:'released',message:'Offscreen resources released; source and configuration retained.'});}}
  function setVisible(next){
    if(disposed)return;visible=next;clearTimeout(releaseTimer);
    if(visible){initialize();resize();dirty=true;wake();}else{suspendInput();halt();if(options.releaseAfter>0)releaseTimer=setTimeout(release,options.releaseAfter*1000);}announce();
  }
  function motionChanged(){applyMotion();dirty=true;halt();wake();announce();}
  function visibilityChanged(){suspendInput();halt();if(!document.hidden){dirty=true;wake();}announce();}
  function checkBounds(){const rect=host.getBoundingClientRect();setVisible(rect.bottom>=-80&&rect.right>=-80&&rect.top<=innerHeight+80&&rect.left<=innerWidth+80);}
  function windowResized(){if(!intersection)checkBounds();resize();}
  const resizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(()=>resize()):null;resizeObserver?.observe(host);
  const intersection=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>setVisible(entries.some(entry=>entry.isIntersecting)),{rootMargin:'80px'}):null;
  if(intersection)intersection.observe(host);else{window.addEventListener('scroll',checkBounds,{passive:true,capture:true});queueMicrotask(checkBounds);}
  if(motion.addEventListener)motion.addEventListener('change',motionChanged);else motion.addListener?.(motionChanged);
  window.addEventListener('resize',windowResized,{passive:true});document.addEventListener('visibilitychange',visibilityChanged);
  const api={
    setOptions(patch){
      if(disposed)return;const next=normalizeOptions(effect,patch,options);if(Object.keys(next).every(key=>next[key]===options[key]))return;
      if(next.paused&&!options.paused||next.speed===0&&options.speed!==0||next.opacity===0&&options.opacity!==0)suspendInput();options=next;applyMotion();halt();
      if(!visible){clearTimeout(releaseTimer);if(options.releaseAfter>0)releaseTimer=setTimeout(release,options.releaseAfter*1000);}
      dirty=true;wake();announce();emit(host,'ft-change',{effect,options:{...options}});
    },
    get options(){return{...options};},get renderer(){return renderer;},
    pause(){api.setOptions({paused:true});},play(){api.setOptions({paused:false});},
    step(seconds=1/60){api.setOptions({paused:true});time+=(Number.isFinite(Number(seconds))?Math.max(0,Number(seconds)):0)*options.speed;api.render(time);},
    render(seconds=time){if(disposed)return;initialize();if(!renderer)return;time=Number.isFinite(Number(seconds))?Math.max(0,Number(seconds)):time;renderer.render(presentation()==='calm'?0:time);frames++;lastFrameAt=performance.now();dirty=false;},
    resetClock(){time=0;lastTick=null;renderer?.clear?.();dirty=true;wake();},resize,
    retry(){if(disposed)return;halt();renderer?.destroy();renderer=null;fault='';error='';dirty=true;lastMode='';initialize();wake();announce();},
    async setSource(next){
      if(disposed)throw new Error('The effect has been destroyed.');if(effect!=='water')throw new TypeError('Only water accepts an image/canvas/video source.');
      const previous=source;source=next||null;const revision=++sourceRevision;
      try{if(renderer)await renderer.setSource(source);}catch(e){if(revision===sourceRevision)source=previous;throw e;}
      if(!disposed&&revision===sourceRevision){dirty=true;wake();}
    },
    setPointer(next){if(motionBlocked()||options.paused||options.speed===0||options.opacity===0||document.hidden||!visible){suspendInput();return;}pointer=next;renderer?.setPointer?.(next);dirty=true;wake();},burst(input){if(motionBlocked()||options.paused||options.speed===0||options.opacity===0||document.hidden||!visible)return;initialize();renderer?.burst?.(input);dirty=true;wake();},clear(){renderer?.clear?.();dirty=true;wake();},refreshSource(){renderer?.refreshSource?.();dirty=true;wake();},
    getStats(){const animationState=state();return{effect,visible,paused:options.paused,reducedMotion:motion.matches,motionPolicy:options.motion,motionPresentation:presentation(),animationState,animationReason:messages[animationState]||animationState,animating:animationState==='running',scheduled:Boolean(stop),time,frames,renderFPS,submitMs,error,effectiveFPS:effectiveFPS(),lastFrameAgeMs:lastFrameAt?performance.now()-lastFrameAt:null,ageSeconds:(performance.now()-started)/1000,cssSize:[width,height],...(renderer?.getState?.()??{backend:presentation()==='hide'?'Suppressed by motion policy':'Waiting for renderer'}),disposed};},
    destroy(){if(disposed)return;disposed=true;sourceRevision++;clearTimeout(releaseTimer);halt();intersection?.disconnect();resizeObserver?.disconnect();if(!intersection)window.removeEventListener('scroll',checkBounds,true);if(motion.removeEventListener)motion.removeEventListener('change',motionChanged);else motion.removeListener?.(motionChanged);window.removeEventListener('resize',windowResized);document.removeEventListener('visibilitychange',visibilityChanged);renderer?.destroy();renderer=null;source=null;pointer=null;emit(host,'ft-disposed',{effect});}
  };
  applyMotion();resize();return api;
}
