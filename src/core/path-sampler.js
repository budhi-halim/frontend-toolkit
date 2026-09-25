// === EVENT-RATE-INDEPENDENT PATH SAMPLING IN CSS PIXELS / MILLISECONDS ===
// Remainders survive event boundaries. A new stroke never bridges across an exit,
// a pause, a resize or a cancelled pointer. Work and output are explicitly bounded.
export function createPathSampler({mode='distance',distance=12,interval=32,limit=96}={}) {
  let previous=null,remainder=0,dropped=0;
  function reset(){previous=null;remainder=0;}
  function configure(next={}) {
    mode=next.mode??mode;distance=Math.max(1,Number(next.distance??distance)||12);
    interval=Math.max(4,Number(next.interval??interval)||32);limit=Math.max(1,Math.min(256,Number(next.limit??limit)||96));reset();
  }
  function push(point,emit) {
    if(!point||![point.x,point.y,point.time].every(Number.isFinite)){reset();return 0;}
    const p={x:point.x,y:point.y,time:point.time};
    if(!previous){previous=p;return 0;}
    const start=previous,dx=p.x-start.x,dy=p.y-start.y,length=Math.hypot(dx,dy),elapsed=p.time-start.time;
    previous=p;
    if(elapsed<0){remainder=0;return 0;}
    const step=mode==='time'?interval:distance,span=mode==='time'?elapsed:length;
    if(span<=0)return 0;
    const total=remainder+span,count=Math.floor((total+1e-8)/step),first=step-remainder;
    const vx=elapsed>0?Math.max(-1200,Math.min(1200,dx*1000/elapsed)):0;
    const vy=elapsed>0?Math.max(-1200,Math.min(1200,dy*1000/elapsed)):0;
    // Sample the newest portion under pathological input instead of accumulating
    // a delayed burst. Normal pointer paths are never tied to the render FPS.
    const skip=Math.max(0,count-limit);dropped+=skip;
    for(let i=skip;i<count;i++){
      const f=Math.min(1,Math.max(0,(first+i*step)/span));
      emit({x:start.x+dx*f,y:start.y+dy*f,time:start.time+elapsed*f,vx,vy});
    }
    remainder=Math.max(0,total-count*step);return count-skip;
  }
  return {push,reset,configure,getState(){return{mode,distance,interval,remainder,dropped};}};
}
