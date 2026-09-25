import {createMaterialWorker} from './material-worker-program.js';
import {materialPixels} from './material-texture.js';

// === SINGLE, BOUNDED TEXTURE WORKER ===
const queue=new Map();let worker=null,releaseWorker=null,busy=null,idleTimer=0,sequence=0,failed=false;
function stop(){worker?.terminate();worker=null;releaseWorker?.();releaseWorker=null;}
function complete(result,error){const item=busy;busy=null;if(item){if(error)item.reject(error);else item.resolve(result);}pump();}
function portable(job){const factor=Math.min(1,384/Math.max(job.width,job.height));return materialPixels({...job,width:Math.max(1,Math.round(job.width*factor)),height:Math.max(1,Math.round(job.height*factor))});}
function pump(){
  clearTimeout(idleTimer);if(busy)return;
  const item=queue.values().next().value;if(!item){idleTimer=setTimeout(stop,3000);return;}queue.delete(item.owner);busy=item;
  if(!worker&&!failed&&typeof Worker!=='undefined'){
    try{const resource=createMaterialWorker();worker=resource.worker;releaseWorker=resource.dispose;worker.onmessage=e=>complete(e.data,e.data.error?new Error(e.data.error):null);worker.onerror=()=>{failed=true;stop();try{complete(portable(busy.job));}catch(error){complete(null,error);}};}
    catch{failed=true;stop();}
  }
  if(worker)worker.postMessage(item.job);else setTimeout(()=>{try{complete(portable(item.job));}catch(error){complete(null,error);}},0);
}
export function requestMaterial(owner,job){return new Promise((resolve,reject)=>{const old=queue.get(owner);if(old)old.resolve(null);queue.set(owner,{owner,job,resolve,reject,id:++sequence});pump();});}
export function cancelMaterial(owner){const item=queue.get(owner);if(item){queue.delete(owner);item.resolve(null);}if(busy?.owner===owner){busy.resolve(null);busy.resolve=()=>{};busy.reject=()=>{};}if(!busy)pump();}
