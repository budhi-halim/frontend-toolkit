import {mulberry32} from './utils.js';

// === DEPTH-LAYERED DROPS WITH CONTINUOUS VELOCITY AND OFFSCREEN RECYCLING ===
export function createRainSystem(input) {
  let options=input,width=1,height=1,quality=1,random=mulberry32(input.seed),drops=[],lastTime=null,age=0,recycled=0;
  const limit=()=>Math.min(1100,Math.max(0,Math.round(width*height*.00125*options.rainDensity*quality)));
  function drop(initial=false) {
    const depth=random(),factor=1-options.rainDepth*(.66*depth),margin=options.rainLength+40;
    return {x:random()*(width+margin*2)-margin,y:initial?random()*(height+margin*2)-margin:-margin,
      depth,factor,size:.65+random()*.65,speed:factor*(.85+random()*.3),phase:random()*Math.PI*2,vx:0,vy:0};
  }
  function budget(){const count=limit();if(drops.length>count)drops.length=count;while(drops.length<count)drops.push(drop(true));}
  function reset(){random=mulberry32(options.seed);drops=[];lastTime=null;age=0;recycled=0;budget();}
  function resize(w,h){if(w===width&&h===height)return;width=Math.max(1,w);height=Math.max(1,h);reset();}
  function setOptions(next){const changed=next.seed!==options.seed||next.rainDepth!==options.rainDepth;options=next;if(changed)reset();else budget();}
  function step(time) {
    if(lastTime!==null&&time<lastTime)reset();
    if(!Number.isFinite(time))return;
    const dt=lastTime===null?0:Math.max(0,time-lastTime),previousAge=age;lastTime=time;age+=dt;
    const margin=options.rainLength*3+50,periodY=height+margin*2,periodX=width+margin*2;
    const wrap=(v,period)=>((v+margin)%period+period)%period-margin;
    for(const p of drops) {
      // Integrate the slow gust analytically. Low FPS changes the sampling of a
      // trajectory, not its CSS-pixel speed, including offscreen recycling.
      p.vx=(options.rainWind+Math.sin(age*.65+p.phase)*options.rainGust*75)*p.factor;
      p.vy=options.rainSpeed*p.speed;
      const gust=options.rainGust*75*(Math.cos(previousAge*.65+p.phase)-Math.cos(age*.65+p.phase))/.65;
      p.x+= (options.rainWind*dt+gust)*p.factor;p.y+=p.vy*dt;
      if(p.y>height+margin){recycled+=Math.floor((p.y+margin)/periodY);p.y=wrap(p.y,periodY);}
      if(p.x>width+margin||p.x<-margin)p.x=wrap(p.x,periodX);
    }
  }
  return {setOptions,resize,step,reset,setQuality(q){quality=Math.max(.15,Math.min(1,q));budget();},
    get drops(){return drops;},getState(){return{drops:drops.length,rainSpeed:options.rainSpeed,rainWind:options.rainWind,recycled,simulationSeconds:age};}};
}
