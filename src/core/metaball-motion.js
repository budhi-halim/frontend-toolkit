import {allowsPointer} from './interaction.js';

// === LOCAL BRUSH IMPULSES ON EVERY NEARBY METABALL ===
// This is a bounded spring/inertia model, not a Navier-Stokes solver. Projection
// matches the ray-march camera so the brush acts where the surface is drawn.
export function createMetaballMotion(input) {
  let options=input,width=1,height=1,bodies=[],lastTime=null,previous=null,affected=0,energy=0;
  const buffer=new Float32Array(40);
  const target=(i,t)=>{const a=i*2.39996+options.seed*.027;return[Math.sin(a+t*(.18+.013*i))*.72,Math.cos(a*1.31+t*.22)*.62,Math.sin(a*1.73-t*.21)*.54];};
  function reset(){bodies=[];for(let i=0;i<options.amount;i++){const [x,y,z]=target(i,0);bodies.push({x,y,z,vx:0,vy:0,vz:0,anchor:[x,y,z],radius:.38+.1*Math.sin(i*7.13)});}lastTime=null;previous=null;energy=0;affected=0;}
  function setOptions(next){const before=options;options=next;if(before.seed!==next.seed||before.amount!==next.amount||before.kind!==next.kind)reset();
    else if(before.interactionMode!==next.interactionMode){previous=null;if(next.interactionMode==='pointer')for(const b of bodies)b.anchor=[b.x,b.y,b.z];}}
  function setPointer(p) {
    if(!allowsPointer('art',options)||options.kind!=='metaballs'||!p?.active){previous=null;return;}
    if(options.interactionTrigger==='press'&&!p.down){previous=null;return;}
    const current={x:p.x*width,y:p.y*height};
    const prior=previous??current;previous=current;
    const dx=current.x-prior.x,dy=current.y-prior.y,len2=dx*dx+dy*dy;if(len2<.001)return;
    affected=0;
    for(const b of bodies){
      const perspective=1.4/(3.5-b.z),px=width*.5+b.x*perspective/options.scale*height,py=height*.5+b.y*perspective/options.scale*height;
      const radius=options.interactionRadius+b.radius*perspective/options.scale*height*.35;
      // Integrate brush influence along the stroke, rather than applying the
      // entire displacement at a single hit point. Bound pathological jumps.
      const samples=Math.min(64,Math.max(1,Math.ceil(Math.sqrt(len2)/8)));let influence=0;
      for(let j=0;j<samples;j++){const f=(j+.5)/samples,d=Math.hypot(px-prior.x-dx*f,py-prior.y-dy*f);influence+=Math.max(0,1-d/radius)**2;}
      if(influence<=0)continue;
      const strength=influence/samples*options.interactionStrength,worldPerPixel=options.scale/(height*perspective);
      if(options.interactionAction==='attract'){
        const weight=Math.min(1,Math.sqrt(len2)/22)*strength;
        b.vx+=(current.x-px)*worldPerPixel*weight*1.5;b.vy+=(current.y-py)*worldPerPixel*weight*1.5;
      }else{b.vx+=dx*worldPerPixel*6*strength;b.vy+=dy*worldPerPixel*6*strength;}
      b.vx=Math.max(-4,Math.min(4,b.vx));b.vy=Math.max(-4,Math.min(4,b.vy));affected++;
    }
    energy=bodies.reduce((e,b)=>e+b.vx*b.vx+b.vy*b.vy,0);
  }
  function step(time) {
    if(options.kind!=='metaballs')return;
    if(lastTime!==null&&time<lastTime)reset();
    const dt=lastTime===null?0:Math.min(.12,Math.max(0,time-lastTime));lastTime=time;
    const autonomous=options.interactionMode!=='pointer',steps=Math.max(1,Math.ceil(dt*120)),h=dt/steps;
    for(let j=0;j<steps;j++)for(let i=0;i<bodies.length;i++){
      const b=bodies[i],goal=autonomous?target(i,time-dt+h*(j+1)):b.anchor;
      for(const [axis,v,component] of [['x','vx',0],['y','vy',1],['z','vz',2]]){
        b[v]+=(goal[component]-b[axis])*4.2*h;b[v]*=Math.exp(-options.viscosity*h);b[axis]+=b[v]*h;
        b[axis]=Math.max(-1.6,Math.min(1.6,b[axis]));
      }
    }
    energy=bodies.reduce((sum,b)=>sum+b.vx*b.vx+b.vy*b.vy+b.vz*b.vz+(b.x-b.anchor[0])**2+(b.y-b.anchor[1])**2,0);
  }
  reset();
  return {setOptions,setPointer,step,resize(w,h){width=w;height=h;previous=null;},reset,
    get animated(){return options.kind!=='metaballs'?options.interactionMode!=='pointer':options.interactionMode!=='pointer'||energy>.00001;},
    uniforms(){buffer.fill(0);for(let i=0;i<bodies.length;i++){const b=bodies[i];buffer.set([b.x,b.y,b.z,b.radius],i*4);}return{'uBodies[0]':buffer};},
    getState(){return{motionSource:options.interactionMode,brushAction:options.interactionAction,brushRadius:options.interactionRadius,affectedBodies:affected,bodies:bodies.length,kineticEnergy:Number(energy.toFixed(5))};},
    suspend(){previous=null;}};
}
