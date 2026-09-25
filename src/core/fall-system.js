import {clamp,finite,mulberry32} from './utils.js';
import {FALL_SHAPES} from './fall-schema.js';

// === DETERMINISTIC MOTION IN CSS PIXELS, INDEPENDENT OF DISPLAY FRAME RATE ===
// Wind and sway are integrated analytically. Particles wrap beyond the clip area;
// no catch-up emission burst is needed after a paused or offscreen controller.
export function createFallSystem(input){
  let options=input,width=1,height=1,quality=1,particles=[],random=mulberry32(input.seed),lastTime=null,age=0,recycled=0;
  const tau=Math.PI*2;
  function particle(){
    const depth=random();
    const shapes=options.shape==='mixed'?FALL_SHAPES[options.kind].slice(1):[options.shape];
    return{x:random()*width,y:random()*height,depth,size:.5+random()*.5,velocity:.85+random()*.3,phase:random()*tau,
      flutter:random()*tau,turn:(random()<.5?-1:1)*(.55+random()*.9),rotation:random()*tau,
      shape:shapes[Math.floor(random()*shapes.length)],palette:Math.floor(random()*3)};
  }
  function budget(){
    const count=Math.min(1500,options.maxParticles,Math.round(width*height/100000*options.density*quality));
    if(particles.length>count)particles.length=count;
    while(particles.length<count)particles.push(particle());
  }
  function reset(){random=mulberry32(options.seed);particles=[];age=0;lastTime=null;recycled=0;budget();}
  function resize(w,h){
    w=clamp(finite(w,1),1,100000);h=clamp(finite(h,1),1,100000);if(w===width&&h===height)return;
    const sx=w/width,sy=h/height;for(const p of particles){p.x*=sx;p.y*=sy;}width=w;height=h;budget();
  }
  function setOptions(next){
    const restart=options.seed!==next.seed||options.kind!==next.kind||options.shape!==next.shape;
    options=next;if(restart)reset();else budget();
  }
  function factor(p){return 1-options.depth*.66*p.depth;}
  function step(time){
    if(!Number.isFinite(time)||time<0)return;
    if(lastTime!==null&&time<lastTime)reset();
    const dt=lastTime===null?0:Math.max(0,time-lastTime),previous=age;lastTime=time;age+=dt;
    const margin=options.size*1.4+8,periodX=width+2*margin,periodY=height+2*margin;
    const wrap=(v,span)=>((v+margin)%span+span)%span-margin;
    const gustW=tau/options.gustPeriod,swayW=tau*options.swaySpeed;
    for(const p of particles){
      const z=factor(p);
      const gust=options.gust*(Math.cos(previous*gustW+p.phase)-Math.cos(age*gustW+p.phase))/gustW;
      const sway=options.sway*(Math.sin(age*swayW+p.phase)-Math.sin(previous*swayW+p.phase));
      p.x+=(options.wind*dt+gust+sway)*z;
      p.y+=options.fallSpeed*p.velocity*z*dt;
      p.rotation=(p.rotation+options.tumble*p.turn*dt)%tau;
      if(p.x>width+margin||p.x<-margin)p.x=wrap(p.x,periodX);
      if(p.y>height+margin){recycled+=Math.floor((p.y+margin)/periodY);p.y=wrap(p.y,periodY);}
    }
  }
  return{setOptions,resize,step,reset,factor,
    setQuality(value){const next=clamp(finite(value,1),.1,1);if(next===quality)return;quality=next;budget();},
    get particles(){return particles;},get time(){return age;},
    getState(){return{particleCount:particles.length,particleBudget:options.maxParticles,simulationSeconds:age,recycled,fallSpeed:options.fallSpeed,wind:options.wind,shape:options.shape,kind:options.kind};},
    destroy(){particles=[];lastTime=null;}
  };
}
