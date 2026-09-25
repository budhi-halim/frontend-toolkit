// === RENDERER REGISTRATION AND REQUEST DEDUPLICATION ===
export const EFFECT_NAMES=['glass','surface','water','fire','smoke','clouds','aurora','glow','fluid','trail','field','sea','art','sketch','highlight','backdrop','pattern','status','fall'];
const factories=new Map(),loaders=new Map(),pending=new Map();
export function registerRenderer(name,factory){if(!EFFECT_NAMES.includes(name)||typeof factory!=='function')throw new TypeError('Invalid effect registration.');factories.set(name,factory);}
export function registerLoader(name,loader){if(!EFFECT_NAMES.includes(name)||typeof loader!=='function')throw new TypeError('Invalid effect loader.');loaders.set(name,loader);}
export function getRenderer(name){return factories.get(name);}
export function loadEffect(name){
  if(factories.has(name))return Promise.resolve(factories.get(name));if(pending.has(name))return pending.get(name);
  if(!loaders.has(name))return Promise.reject(new RangeError(`No renderer or loader registered for ${name}.`));
  const task=Promise.resolve().then(loaders.get(name)).then(factory=>{registerRenderer(name,factory);return factory;}).finally(()=>pending.delete(name));pending.set(name,task);return task;
}
export function loadingStats(){return{loaded:[...factories.keys()],pending:[...pending.keys()],available:[...new Set([...factories.keys(),...loaders.keys()])]};}
export function afterLoad({idle=false,signal}={}){
  return new Promise((resolve,reject)=>{
    let idleId=0,timer=0,done=false;
    const finish=error=>{if(done)return;done=true;window.removeEventListener('load',ready);signal?.removeEventListener('abort',abort);if(idleId)globalThis.cancelIdleCallback?.(idleId);clearTimeout(timer);error?reject(error):resolve();};
    const abort=()=>finish(new DOMException('Loading cancelled.','AbortError'));
    const ready=()=>{if(idle){if(globalThis.requestIdleCallback)idleId=requestIdleCallback(()=>finish(),{timeout:2000});else timer=setTimeout(()=>finish(),100);}else finish();};
    if(signal?.aborted){abort();return;}signal?.addEventListener('abort',abort,{once:true});if(document.readyState==='complete')ready();else window.addEventListener('load',ready,{once:true});
  });
}
export function preload(effects=EFFECT_NAMES,{when='idle',signal}={}){
  const names=typeof effects==='string'?[effects]:effects;
  if(!Array.isArray(names)||names.some(name=>!EFFECT_NAMES.includes(name)))return Promise.reject(new TypeError('preload() requires known effect names.'));
  if(!['now','eager','idle','load'].includes(when))return Promise.reject(new TypeError('Preload timing must be now, eager, load, or idle.'));
  const ready=['idle','load'].includes(when)?afterLoad({idle:when==='idle',signal}):Promise.resolve();
  return ready.then(async()=>{const result=[];for(const name of [...new Set(names)]){if(signal?.aborted)throw new DOMException('Loading cancelled.','AbortError');result.push(await loadEffect(name));}return result;});
}
