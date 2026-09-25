import {normalizeOptions} from '../core/schema.js';
import {decorate,mulberry32} from '../core/utils.js';
import {createPathSampler} from '../core/path-sampler.js';

// === POOLED, POINTER-DRIVEN PARTICLE BRUSHES ===
function particleSprite(kind,color,color2,variant=0){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');ctx.translate(64,64);
  if(['smoke','fireflies','embers','comet'].includes(kind)){
    if(kind==='smoke'){
      const random=mulberry32(317+variant);for(let i=0;i<18;i++){const x=(random()-.5)*48,y=(random()-.5)*48,r=16+random()*22,gradient=ctx.createRadialGradient(x-r*.2,y-r*.22,0,x,y,r);gradient.addColorStop(0,color2);gradient.addColorStop(.3,color);gradient.addColorStop(1,'transparent');ctx.globalAlpha=.14;ctx.fillStyle=gradient;ctx.fillRect(-64,-64,128,128);}ctx.globalAlpha=1;
    }else{const gradient=ctx.createRadialGradient(0,0,0,0,0,55);gradient.addColorStop(0,'white');gradient.addColorStop(.06,color2);gradient.addColorStop(.2,color);gradient.addColorStop(1,'transparent');ctx.fillStyle=gradient;ctx.fillRect(-64,-64,128,128);}
  }else if(kind==='flowers'){
    const petals=[5,6,8,12][variant%4];for(let i=0;i<petals;i++){ctx.save();ctx.rotate(i/petals*Math.PI*2);const grad=ctx.createLinearGradient(0,-48,0,5);grad.addColorStop(0,color2);grad.addColorStop(1,color);ctx.fillStyle=grad;ctx.beginPath();ctx.ellipse(0,-23,[17,14,10,7][variant%4],27,0,0,Math.PI*2);ctx.fill();ctx.restore();}ctx.fillStyle='#e4ad4c';ctx.beginPath();ctx.arc(0,0,10,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff0b7';for(let i=0;i<12;i++){const a=i*2.4,r=Math.sqrt(i)*2;ctx.beginPath();ctx.arc(Math.cos(a)*r,Math.sin(a)*r,1.5,0,Math.PI*2);ctx.fill();}
  }else if(kind==='petals'){
    const gradient=ctx.createLinearGradient(-30,-40,32,40);gradient.addColorStop(0,color2);gradient.addColorStop(.5,color);gradient.addColorStop(1,color2);ctx.fillStyle=gradient;ctx.beginPath();ctx.moveTo(0,-48);ctx.bezierCurveTo(55,-50,43,27,0,47);ctx.bezierCurveTo(-31,25,-49,-33,0,-48);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.3)';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(0,-38);ctx.quadraticCurveTo(8,7,0,39);ctx.stroke();
  }else if(kind==='bubbles'){
    const g=ctx.createRadialGradient(-20,-23,1,0,0,47);g.addColorStop(0,'rgba(255,255,255,.7)');g.addColorStop(.25,'rgba(180,235,250,.05)');g.addColorStop(.8,'rgba(180,235,250,.02)');g.addColorStop(.96,color);g.addColorStop(1,'rgba(255,255,255,.6)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,47,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.85)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,39,3.6,4.4);ctx.stroke();
  }else if(kind==='snow'){
    ctx.strokeStyle=color2;ctx.lineWidth=3;ctx.lineCap='round';for(let i=0;i<6;i++){ctx.save();ctx.rotate(i*Math.PI/3);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-48);for(let j=1;j<=3;j++){const y=-j*12;ctx.moveTo(0,y);ctx.lineTo(-10,y-8);ctx.moveTo(0,y);ctx.lineTo(10,y-8);}ctx.stroke();ctx.restore();}
  }else if(kind==='confetti'){ctx.fillStyle=color;ctx.fillRect(-26,-40,52,80);ctx.fillStyle='rgba(255,255,255,.35)';ctx.fillRect(-26,-40,10,80);}
  else{
    const g=ctx.createRadialGradient(0,0,0,0,0,50);g.addColorStop(0,'white');g.addColorStop(.45,color2);g.addColorStop(1,color);ctx.fillStyle=g;ctx.beginPath();const arms=[4,5,6,8][variant%4];for(let i=0;i<arms*2;i++){const a=i/(arms*2)*Math.PI*2-Math.PI/2,r=i%2?[10,22,19,17][variant%4]:51;if(i===0)ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);else ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();
  }
  return canvas;
}
export function createTrailRenderer(mount,input={}) {
  let options=normalizeOptions('trail',input),width=1,height=1,scale=1,lastTime=null;
  let random=mulberry32(options.seed),particles=[],pool=[],sprites=[],pointer=null;
  let requests=[],pending=[],serial=0,spawned=0,disposed=false,droppedSamples=0;
  let pointerClock=0;
  const pointerSampler=createPathSampler(),autoSampler=createPathSampler();
  function resetStroke(){pointerSampler.reset();autoSampler.reset();}
  function configureSamplers(){for(const sampler of [pointerSampler,autoSampler])sampler.configure({mode:options.throttle,distance:options.distanceInterval,interval:options.timeInterval});}
  function enqueue(p){if(pending.length>=256){pending.shift();droppedSamples++;}pending.push(p);}
  let quality={scale:1,particles:1,name:'Full'};
  const canvas=decorate(document.createElement('canvas'),{position:'absolute',inset:'0',width:'100%',height:'100%',borderRadius:'inherit',pointerEvents:'none'});
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas 2D is unavailable.');mount.append(canvas);
  const collections={botanical:['flowers','petals'],celestial:['stars','comet','fireflies'],celebration:['confetti','stars','flowers'],all:['stars','flowers','petals','embers','bubbles','snow','confetti']};
  const trigger=()=>options.autoEmit?'auto':options.trigger;
  function buildSprites() {
    for(const item of sprites)item.image.width=item.image.height=1;sprites=[];
    const mode=options.rainbow?'rainbow':options.colorMode;
    const colors=[options.color,options.color2,options.color3,options.color4];
    const kinds=options.kind==='mixed'?collections[options.mix]:[options.kind];
    const count=mode==='rainbow'?8:mode==='single'||mode==='gradient'?1:4;
    for(const kind of kinds)for(let c=0;c<count;c++)for(let v=0;v<4;v++) {
      const primary=mode==='rainbow'?`hsl(${c*45} 82% 64%)`:mode==='gradient'?options.color:colors[c];
      const secondary=mode==='rainbow'?`hsl(${c*45+14} 90% 86%)`:mode==='single'||mode==='gradient'?options.color2:colors[(c+1)%4];
      // Bounded reusable sprite atlas; all geometry/color choices happen before animation.
      sprites.push({image:particleSprite(kind,primary,secondary,v),kind,color:primary,color2:secondary,variant:v,palette:c});
    }
  }
  function resize() {
    scale=Math.min(globalThis.devicePixelRatio||1,options.dprCap)*options.quality*quality.scale;
    scale*=Math.min(1,2048/(width*scale),2048/(height*scale));
    const w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale));
    if(w!==canvas.width||h!==canvas.height){canvas.width=w;canvas.height=h;}
    canvas.style.opacity=String(options.opacity);
  }
  function trimBudget(){const limit=Math.max(1,Math.round(options.count*quality.particles));if(particles.length>limit)pool.push(...particles.splice(limit));}
  function clear() {
    pool.push(...particles);particles=[];lastTime=null;resetStroke();requests=[];pending=[];
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
  }
  function spawn(position,velocity) {
    const limit=Math.max(1,Math.round(options.count*quality.particles));if(particles.length>=limit)return;
    const variant=options.variantMode==='fixed'?Math.round(options.variant):options.variantMode==='cycle'?serial%4:Math.floor(random()*4);
    const candidates=sprites.length/4,index=Math.floor(random()*candidates)*4+variant;
    const p=pool.pop()||{},spread=options.spread;
    Object.assign(p,{x:position.x,y:position.y,vx:velocity.x*.16+(random()-.5)*spread,vy:velocity.y*.16+(random()-.5)*spread,
      age:0,life:options.life*(.75+random()*.5),size:options.size*(1+(random()-.5)*options.sizeVariation*1.5),rotation:random()*Math.PI*2,
      spin:(random()-.5)*2,phase:random()*Math.PI*2,sprite:index,segment:position.segment??serial});
    particles.push(p);serial++;spawned++;
  }
  function burst({x=.5,y=.5,count=options.burstCount}={}) {
    if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||x>1||y<0||y>1)return;
    if(requests.length<16)requests.push({x:x*width,y:(1-y)*height,count:Math.max(1,Math.min(160,Math.round(Number(count)||options.burstCount)))});
  }
  function setPointer(p) {
    if(!options.interactive)return;
    const prior=pointer,inside=p?.active&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1;
    pointer={...p,active:Boolean(inside)};
    if(!inside){pointerSampler.reset();return;}
    const mode=trigger(),time=Number.isFinite(p.timeStamp)?p.timeStamp:performance.now();
    const gap=time-pointerClock;pointerClock=Math.max(pointerClock,time);
    const position={x:p.x*width,y:(1-p.y)*height,time:pointerClock};
    const justPressed=p.event==='pointerdown'||(p.down&&!prior?.down);
    if(mode==='click'&&justPressed){burst(p);return;}
    if(!['move','both','hover','press'].includes(mode))return;
    if(mode==='press'&&!p.down){pointerSampler.reset();return;}
    // Touch gestures have no hover; a cancelled contact never survives as a brush.
    const moved=!prior?.active||Math.hypot((p.x-prior.x)*width,(p.y-prior.y)*height)>.001;
    if(moved&&prior?.active&&options.throttle==='time'&&['move','both'].includes(mode)&&gap>Math.max(160,options.timeInterval*2)){
      // A stationary cursor sends no move events. Do not interpret that silence
      // as seconds of unobserved drawing and dump a catch-up cloud on resuming.
      pointerSampler.reset();pointerSampler.push(position,enqueue);enqueue({...position,vx:0,vy:0});return;
    }
    if(moved||['hover','press'].includes(mode))pointerSampler.push(position,enqueue);
  }
  function wantsEmission() {
    const mode=trigger();return ['auto','both'].includes(mode)||(options.throttle==='time'&&options.interactive&&pointer?.active&&(
      mode==='hover'||mode==='press'&&pointer.down));
  }
  function render(time) {
    if(disposed)return;if(lastTime!==null&&time<lastTime)clear();
    const dt=lastTime===null?0:Math.max(0,Math.min(.12,time-lastTime));lastTime=time;
    for(const request of requests)for(let i=0;i<request.count;i++)spawn(request,{x:(random()-.5)*160,y:(random()-.5)*160});requests=[];
    const mode=trigger();
    if(['auto','both'].includes(mode)) {
      autoSampler.push({x:width*(.5+Math.sin(time*.75)*.28),y:height*(.5+Math.sin(time*.99)*.24),time:time*1000},enqueue);
    }
    if(options.throttle==='time'&&options.interactive&&pointer?.active&&(mode==='hover'||mode==='press'&&pointer.down)) {
      // Pointer event time and render time are different clocks. Only advance the
      // stationary emitter by elapsed frame time, not by the absolute scene age.
      pointerClock+=dt*1000;
      pointerSampler.push({x:pointer.x*width,y:(1-pointer.y)*height,time:pointerClock},enqueue);
    }
    for(const point of pending)spawn(point,{x:point.vx,y:point.vy});pending=[];
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.setTransform(scale,0,0,scale,0,0);
    for(let i=particles.length-1;i>=0;i--) {
      const p=particles[i];p.age+=dt;
      if(p.age>=p.life){particles[i]=particles[particles.length-1];particles.pop();pool.push(p);continue;}
      const item=sprites[p.sprite%sprites.length],kind=item.kind,progress=p.age/p.life;
      p.vx+=(options.wind*.35+Math.sin(p.phase+time*1.8)*options.turbulence*24)*dt;
      p.vy+=(options.gravity+Math.cos(p.phase+time*1.3)*options.turbulence*12)*dt;
      p.vx*=Math.exp(-dt*.7);p.vy*=Math.exp(-dt*.24);p.x+=p.vx*dt;p.y+=p.vy*dt;p.rotation+=p.spin*dt;
      const fade=Math.min(1,p.age/.09)*Math.pow(1-progress,1.25),size=p.size*(kind==='smoke'?1+progress*3:kind==='bubbles'?1+progress*.35:1);
      ctx.globalCompositeOperation=['stars','embers','fireflies','comet'].includes(kind)?'lighter':'source-over';
      ctx.globalAlpha=fade*(kind==='smoke'?.78:1);
      if(kind==='ribbons') {
        ctx.strokeStyle=item.color;ctx.lineWidth=size*fade;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(p.x-p.vx*.07,p.y-p.vy*.07);ctx.lineTo(p.x,p.y);ctx.stroke();
      }else if(kind==='comet') {
        const speed=Math.hypot(p.vx,p.vy),length=size*2+Math.min(90,speed*.22),nx=speed>1?p.vx/speed:Math.cos(p.rotation),ny=speed>1?p.vy/speed:Math.sin(p.rotation);
        const tx=p.x-nx*length,ty=p.y-ny*length,g=ctx.createLinearGradient(tx,ty,p.x,p.y);g.addColorStop(0,'transparent');g.addColorStop(.65,item.color);g.addColorStop(1,item.color2);
        ctx.strokeStyle=g;ctx.lineWidth=Math.max(.5,size*.32);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.drawImage(item.image,p.x-size,p.y-size,size*2,size*2);
      }else {
        ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rotation);
        if(['petals','flowers','confetti'].includes(kind))ctx.scale(.3+Math.abs(Math.cos(p.rotation*.7+p.phase))*.7,1);
        ctx.drawImage(item.image,-size,-size,size*2,size*2);ctx.restore();
      }
    }
    ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  }
  configureSamplers();buildSprites();resize();
  return {
    get animated(){return wantsEmission()||particles.length>0||requests.length>0||pending.length>0;},get canvas(){return canvas;},
    setOptions(next){const old=options;options=normalizeOptions('trail',next,options);
      if(old.seed!==options.seed)random=mulberry32(options.seed);
      if(['kind','mix','color','color2','color3','color4','rainbow','colorMode'].some(k=>old[k]!==options[k])){buildSprites();clear();}
      if(['trigger','autoEmit','throttle','distanceInterval','timeInterval','interactive'].some(k=>old[k]!==options[k])){configureSamplers();pending=[];}
      if(!options.interactive)pointer=null;trimBudget();resize();},
    setQuality(next){const changed=Math.abs(next.scale-quality.scale)>.08;quality=next;trimBudget();if(changed)resize();},
    setPointer,burst,resize(w,h){if(w!==width||h!==height){resetStroke();pending=[];}width=w;height=h;resize();},render,clear,
    suspendInput(){pointer=null;pending=[];requests=[];resetStroke();},
    getState(){return{backend:'Canvas particle pool',brush:options.kind,trigger:trigger(),throttle:options.throttle,distanceInterval:options.distanceInterval,timeInterval:options.timeInterval,queuedSamples:pending.length,droppedSamples:droppedSamples+pointerSampler.getState().dropped+autoSampler.getState().dropped,colorMode:options.rainbow?'rainbow':options.colorMode,variantMode:options.variantMode,particles:particles.length,spawned,spriteCount:sprites.length,liveVariants:new Set(particles.map(p=>sprites[p.sprite%sprites.length].variant)).size,liveColors:new Set(particles.map(p=>sprites[p.sprite%sprites.length].palette)).size,liveShapes:new Set(particles.map(p=>sprites[p.sprite%sprites.length].kind)).size,budget:Math.round(options.count*quality.particles),qualityLevel:quality.name,pixels:[canvas.width,canvas.height]};},
    destroy(){disposed=true;canvas.remove();canvas.width=canvas.height=1;for(const s of sprites)s.image.width=s.image.height=1;sprites=[];particles=[];pool=[];requests=[];pending=[];pointer=null;resetStroke();}
  };
}
