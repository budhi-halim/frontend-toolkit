// === SHARED, REVERSIBLE FRAME-BUDGET GOVERNOR ===
export const QUALITY_LEVELS = [
  {name:'Full', scale:1, detail:1, particles:1, iterations:1},
  {name:'High', scale:1, detail:.78, particles:.82, iterations:.85},
  {name:'Balanced', scale:.8, detail:.62, particles:.65, iterations:.7},
  {name:'Low', scale:.61, detail:.44, particles:.45, iterations:.55},
  {name:'Economy', scale:.44, detail:.28, particles:.3, iterations:.4}
];
export class FrameBudgetGovernor {
  constructor(){this.level=0;this.last=0;this.window=[];this.cooldown=0;this.good=0;this.bad=0;this.fps=0;this.p90=0;this.target=60;this.reason='Measuring frame delivery';this.revision=0;}
  resetTiming(){this.last=0;this.window.length=0;this.good=0;this.bad=0;}
  sample(now,target=60){
    this.target=Math.max(1,Math.min(120,target));
    let dt=this.last?now-this.last:0;this.last=now;
    if(dt<2)return false;
    if(dt>5000){this.resetTiming();this.last=now;return false;}
    // Sustained sub-4-FPS overload must still trigger reductions. Visibility resets handle tab suspension.
    dt=Math.min(dt,2000);this.window.push(dt);
    if(this.window.reduce((a,b)=>a+b,0)<1000)return false;
    const samples=this.window.splice(0),elapsed=samples.reduce((a,b)=>a+b,0);
    const mean=elapsed/samples.length;this.fps=1000/mean;
    samples.sort((a,b)=>a-b);this.p90=samples[Math.floor((samples.length-1)*.9)];
    const budget=1000/this.target;
    if(mean>budget*1.22){this.bad+=elapsed;this.good=0;}
    else if(mean<budget*1.09&&this.p90<budget*1.35){this.good+=elapsed;this.bad=0;}
    else{this.good=0;this.bad=0;}
    if(now<this.cooldown)return false;
    let next=this.level;
    if(this.bad>=1400&&this.level<QUALITY_LEVELS.length-1){next++;this.reason='Frame budget exceeded';this.cooldown=now+2200;}
    else if(this.good>=5500&&this.level>0){next--;this.reason='Sustained headroom; recovering detail';this.cooldown=now+6000;}
    if(next===this.level)return false;
    this.level=next;this.good=0;this.bad=0;this.revision++;return true;
  }
  getState(){return {...QUALITY_LEVELS[this.level],level:this.level,revision:this.revision,measuredFPS:this.fps,p90FrameMs:this.p90,targetFPS:this.target,reason:this.reason};}
}
