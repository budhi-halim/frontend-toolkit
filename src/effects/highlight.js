import {normalizeOptions} from '../core/schema.js';
import {mulberry32,clamp} from '../core/utils.js';
import {cleanPointer} from '../core/interaction.js';
import {roundedPath} from '../core/geometry.js';
import {createCanvasSurface,rgba,cachedGrain} from '../core/canvas-surface.js';

// === LOCAL LIGHT AND FEEDBACK; NO CONTENT TRANSFORMS OR GLOBAL LISTENERS ===
export function createHighlightRenderer(mount,input={}){
  let o=normalizeOptions('highlight',input),surface=createCanvasSurface(mount,o),pointer={active:false,x:.5,y:.5,down:false},focused=false;
  let pending=[],pulses=[],lastTime=null,lastAuto=-1,active=false,level=0,cx=o.centerX,cy=o.centerY,seeds=[],grain=null,manualUntil=-1,rendered=0;
  const {ctx,canvas}=surface,tau=Math.PI*2;
  function seed(){const random=mulberry32(o.seed);seeds=Array.from({length:120},()=>[random(),random(),random(),random()]);if(grain){grain.width=grain.height=1;}grain=cachedGrain(o.seed);}
  function engaged(){return o.activation==='auto'||o.activation==='hover'&&pointer.active||o.activation==='press'&&pointer.active&&pointer.down||o.activation==='focus'&&focused;}
  function pulse(p={}){
    const x=Number.isFinite(p.x)?clamp(p.x,0,1):o.centerX,y=Number.isFinite(p.y)?1-clamp(p.y,0,1):o.centerY;
    pending.push({x,y});if(pending.length>o.maxPulses)pending.splice(0,pending.length-o.maxPulses);
  }
  function setPointer(input){
    const p=cleanPointer(input);if(o.activation==='manual'||o.activation==='auto'&&o.motionSource==='auto')return;
    const was=engaged();pointer=p;
    if(p.event==='focusin')focused=true;else if(p.event==='focusout'||p.event==='pointercancel')focused=false;
    const now=engaged(),click=o.activation==='click'&&p.active&&['pointerdown','keyboardactivate'].includes(p.event);
    if(click||now&&!was)if(['sheen','ripple'].includes(o.kind)||click)pulse(p);
  }
  function suspend(){pointer={active:false,x:o.centerX,y:1-o.centerY,down:false};focused=false;pending=[];active=false;manualUntil=-1;}
  function clear(){suspend();pulses=[];lastAuto=-1;lastTime=null;level=0;cx=o.centerX;cy=o.centerY;}
  function setOptions(next){const prev=o;o=normalizeOptions('highlight',next,o);surface.setOptions(o);if(prev.seed!==o.seed)seed();if(prev.kind!==o.kind||prev.activation!==o.activation){clear();}if(pulses.length>o.maxPulses)pulses.splice(0,pulses.length-o.maxPulses);}
  function position(t,dt){
    let x=o.centerX,y=o.centerY;
    if((o.motionSource==='auto'||o.motionSource==='both'&&!pointer.active)&&active){x+=Math.sin(t*.63)*.28;y+=Math.sin(t*.81+.8)*.22;}
    else if(pointer.active&&o.motionSource!=='auto'){x=pointer.x;y=1-pointer.y;}
    const blend=o.follow===0?1:1-Math.exp(-dt/Math.max(.001,o.follow));cx+=(x-cx)*blend;cy+=(y-cy)*blend;
    if(Math.abs(cx-x)<.0001)cx=x;if(Math.abs(cy-y)<.0001)cy=y;
    return Math.abs(cx-x)+Math.abs(cy-y)>.0002;
  }
  let following=false;
  function glow(w,h){
    ctx.save();
    if(o.kind==='edge'){
      const path=new Path2D();roundedPath(path,o.lineWidth/2,o.lineWidth/2,Math.max(0,w-o.lineWidth),Math.max(0,h-o.lineWidth),Math.max(0,surface.radius-o.lineWidth/2));
      const g=ctx.createRadialGradient(cx*w,cy*h,0,cx*w,cy*h,o.radius);g.addColorStop(0,rgba(o.color,.95));g.addColorStop(Math.max(.01,1-o.softness),rgba(o.color,.65));g.addColorStop(1,rgba(o.color,0));ctx.strokeStyle=g;ctx.lineWidth=o.lineWidth;ctx.stroke(path);
    }else{
      const g=ctx.createRadialGradient(cx*w,cy*h,0,cx*w,cy*h,o.radius);g.addColorStop(0,rgba(o.color,.7));g.addColorStop(Math.max(.01,1-o.softness),rgba(o.color,.45));g.addColorStop(1,rgba(o.color,0));ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    }ctx.restore();
  }
  function sheen(w,h,t){
    const angle=o.angle*Math.PI/180,diagonal=Math.hypot(w,h);
    for(const p of pulses){const age=(t-p.born)/o.duration;if(age<0||age>1)continue;const pos=(age*2-1)*(diagonal+o.bandWidth)/2;
      ctx.save();ctx.translate(w/2,h/2);ctx.rotate(angle);const half=o.bandWidth/2,g=ctx.createLinearGradient(pos-half,0,pos+half,0);
      g.addColorStop(0,rgba(o.color,0));g.addColorStop(.5-.15*Math.max(.1,o.softness),rgba(o.color,.12));g.addColorStop(.5,rgba(o.color,.8));g.addColorStop(.5+.15*Math.max(.1,o.softness),rgba(o.color2,.16));g.addColorStop(1,rgba(o.color,0));
      ctx.fillStyle=g;ctx.globalAlpha*=Math.sin(age*Math.PI)**.5;ctx.fillRect(pos-half,-diagonal,Math.max(1,o.bandWidth),diagonal*2);ctx.restore();}
  }
  function ripples(w,h,t){
    for(const p of pulses){const age=(t-p.born)/o.duration;if(age<0||age>1)continue;const radius=Math.max(.05,o.radius*(1-(1-age)**2)),a=(1-age)**1.6;
      ctx.save();ctx.translate(p.x*w,p.y*h);ctx.globalAlpha*=a;
      if(o.rippleStyle==='filled'){const g=ctx.createRadialGradient(0,0,0,0,0,radius);g.addColorStop(0,rgba(o.color,.14));g.addColorStop(.85,rgba(o.color,.22));g.addColorStop(1,rgba(o.color,0));ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,radius,0,tau);ctx.fill();}
      else{ctx.lineWidth=o.lineWidth;ctx.strokeStyle=o.color;ctx.beginPath();ctx.arc(0,0,radius,0,tau);ctx.stroke();if(o.rippleStyle==='double'){ctx.globalAlpha*=.5;ctx.strokeStyle=o.color2;ctx.beginPath();ctx.arc(0,0,radius*.8,0,tau);ctx.stroke();}}ctx.restore();
    }
  }
  function sparkle(w,h,t){
    const count=Math.min(o.count,Math.ceil(o.count*surface.quality.particles));
    for(let i=0;i<count;i++){const s=seeds[i],phase=(t/o.duration+s[2]*4)%3;if(phase>1)continue;const a=Math.sin(phase*Math.PI)**3,size=o.sparkleSize*(.5+s[3])*(.4+.6*a);ctx.save();ctx.translate(s[0]*w,s[1]*h);ctx.rotate(s[2]*Math.PI*.35);ctx.globalAlpha*=a;ctx.fillStyle=i%2?o.color:o.color2;ctx.beginPath();for(let j=0;j<8;j++){const theta=j/8*tau,r=j%2?size*.17:size;j?ctx.lineTo(Math.cos(theta)*r,Math.sin(theta)*r):ctx.moveTo(r,0);}ctx.closePath();ctx.fill();ctx.restore();}
  }
  function foil(w,h){
    const angle=(o.angle+(cx-.5)*45)*Math.PI/180,len=Math.hypot(w,h),shift=(cx-.5)*w*.4+(cy-.5)*h*.3;
    ctx.save();ctx.translate(w/2,h/2);ctx.rotate(angle);const bands=ctx.createLinearGradient(-len/2+shift,0,len/2+shift,0);
    [o.color,o.color2,o.color3,o.color,o.color2].forEach((c,i)=>bands.addColorStop(i/4,rgba(c,i===2?.55:.25)));ctx.fillStyle=bands;ctx.fillRect(-len,-len,len*2,len*2);ctx.restore();
    const g=ctx.createRadialGradient(cx*w,cy*h,1,cx*w,cy*h,Math.max(w,h)*.7);g.addColorStop(0,'rgba(255,255,255,.45)');g.addColorStop(.26,'rgba(255,255,255,.07)');g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    if(o.texture>0){ctx.save();ctx.globalAlpha*=o.texture*.35;ctx.globalCompositeOperation='screen';ctx.fillStyle=ctx.createPattern(grain,'repeat');ctx.fillRect(0,0,w,h);ctx.restore();}
  }
  function render(time){
    if(!Number.isFinite(time)||surface.disposed)return;if(lastTime!==null&&time<lastTime)clear();const dt=lastTime===null?1/60:Math.max(0,time-lastTime);lastTime=time;rendered++;
    const on=engaged();
    if(o.activation==='auto'&&['sheen','ripple'].includes(o.kind)){const index=Math.floor(time/Math.max(o.interval,o.duration));if(index!==lastAuto){lastAuto=index;pulse();}}
    for(const p of pending){pulses.push({...p,born:time});manualUntil=time+o.duration;}pending=[];
    pulses=pulses.filter(p=>time-p.born<=o.duration).slice(-o.maxPulses);
    active=on||time<manualUntil;const target=active?1:o.idleIntensity;
    level+=(target-level)*(1-Math.exp(-dt/.1));if(Math.abs(level-target)<.001)level=target;
    following=['spotlight','foil','edge'].includes(o.kind)?position(time,dt):false;if(!surface.begin())return;
    const w=surface.width,h=surface.height;ctx.save();if(o.clip)surface.clip();
    ctx.globalAlpha=clamp(o.intensity*(['ripple','sheen'].includes(o.kind)?1:level),0,1);
    if(o.kind==='ripple')ripples(w,h,time);else if(o.kind==='sheen')sheen(w,h,time);else if(o.kind==='sparkle')sparkle(w,h,time);else if(o.kind==='foil')foil(w,h);else glow(w,h);
    ctx.restore();
  }
  seed();
  return{releasable:true,canvas,setOptions,resize:(w,h)=>surface.resize(w,h),setQuality:q=>surface.setQuality(q),render,setPointer,burst:pulse,suspendInput:suspend,clear,
    get animated(){const pulsing=pending.length||pulses.length;if(['ripple','sheen'].includes(o.kind))return Boolean(pulsing||o.activation==='auto');return Boolean(pulsing||Math.abs(level-(engaged()?1:o.idleIntensity))>.001||following||active&&(['auto','both'].includes(o.motionSource)&&['spotlight','foil','edge'].includes(o.kind)||o.kind==='sparkle')||o.activation==='auto'&&['sheen','ripple'].includes(o.kind));},
    getState(){return{backend:'Canvas local light',kind:o.kind,activation:o.activation,inputActive:engaged(),pulses:pulses.length,pending:pending.length,frames:rendered,...surface.getState()};},
    destroy(){surface.destroy();pending=[];pulses=[];seeds=[];if(grain)grain.width=grain.height=1;grain=null;}
  };
}
