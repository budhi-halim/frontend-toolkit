import {FrameBudgetGovernor} from './adaptive.js';

// === ONE CLOCK AND ONE BUDGET ACROSS VISIBLE EFFECTS ===
const jobs=new Map(),governor=new FrameBudgetGovernor();
let frame=0,listening=false,pumping=false;
function cleanup(){if(jobs.size)return;cancelAnimationFrame(frame);frame=0;if(listening)document.removeEventListener('visibilitychange',visibility);listening=false;governor.resetTiming();}
function pump(now){
  frame=0;pumping=true;
  const targets=[...jobs.values()].filter(o=>o.adaptive).map(o=>o.targetFPS);
  // A requested 120 FPS cap must not force quality reductions on a 60 Hz screen.
  if(targets.length)governor.sample(now,Math.min(60,Math.max(...targets)));
  const quality=governor.getState();
  for(const [job,settings] of [...jobs]){
    if(!jobs.has(job))continue;
    try{job(now,quality);}catch(error){jobs.delete(job);settings.onError?.(error);console.error('[frontend-toolkit]',error);}
  }
  pumping=false;if(jobs.size&&!document.hidden&&!frame)frame=requestAnimationFrame(pump);else if(!jobs.size)cleanup();
}
function wake(){if(!pumping&&!frame&&jobs.size&&!document.hidden)frame=requestAnimationFrame(pump);}
function visibility(){governor.resetTiming();if(document.hidden){cancelAnimationFrame(frame);frame=0;}else wake();}
export function schedule(job,{adaptive=false,targetFPS=60,onError}={}){
  if(!jobs.size)governor.resetTiming();
  jobs.set(job,{adaptive,targetFPS,onError});
  if(!listening){document.addEventListener('visibilitychange',visibility);listening=true;}
  wake();let active=true;
  return()=>{if(!active)return;active=false;jobs.delete(job);cleanup();};
}
export function schedulerStats(){return{jobs:jobs.size,scheduled:Boolean(frame),adaptive:governor.getState()};}
