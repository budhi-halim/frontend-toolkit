import {normalizeOptions} from '../core/schema.js';
import {decorate,mulberry32,colorRGB} from '../core/utils.js';
import {lightningGeometry} from '../core/lightning-geometry.js';
import {allowsPointer,cleanPointer} from '../core/interaction.js';

// === KINETIC VECTOR DRAWINGS WITH BOUNDED GEOMETRY AND NO DOM PARTICLES ===
export function createSketchRenderer(mount,input={}){
  let options=normalizeOptions('sketch',input),width=1,height=1,scale=1,quality={scale:1,particles:1,name:'Full'},seeds=[],lastKey='',bolts=[],pointer={x:.5,y:.5,active:false},disposed=false,colors=[],strikeStart=-Infinity,lastRender=0,manualStrike=null,strikeSerial=0,segments=[];
  const canvas=decorate(document.createElement('canvas'),{position:'absolute',inset:'0',width:'100%',height:'100%',borderRadius:'inherit',pointerEvents:'none'}),ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('Canvas 2D is unavailable.');mount.append(canvas);
  const tau=Math.PI*2,mixColor=(t,a=1)=>`rgba(${colors[0].map((v,k)=>Math.round((v*(1-t)+colors[1][k]*t)*255)).join(',')},${a})`;
  function seed(){const r=mulberry32(options.seed);seeds=Array.from({length:220},()=>[r(),r(),r(),r()]);lastKey='';}
  function resize(w=width,h=height){width=w;height=h;scale=Math.min(globalThis.devicePixelRatio||1,options.dprCap)*options.quality*quality.scale;scale*=Math.min(1,1800/(w*scale),1800/(h*scale));const cw=Math.max(1,Math.round(w*scale)),ch=Math.max(1,Math.round(h*scale));if(cw!==canvas.width||ch!==canvas.height){canvas.width=cw;canvas.height=ch;}canvas.style.opacity=String(options.opacity);lastKey='';}
  function setOptions(next){const before=options;options=normalizeOptions('sketch',next,options);if(!allowsPointer('sketch',options))pointer={active:false,x:.5,y:.5};colors=[colorRGB(options.color),colorRGB(options.color2)];if(before.seed!==options.seed||before.kind!==options.kind){seed();clear();}if(before.strikeTrigger!==options.strikeTrigger)clear();resize();}
  function orbit(t){
    const n=Math.max(72,Math.round(options.count*3*quality.particles)),points=[],angle=t*.15,tilt=.45,size=Math.min(width,height)*.22*options.scale;
    for(let i=0;i<=n;i++){
      const a=i/n*tau,r=1+.30*Math.cos(a*3),x=r*Math.cos(a*2),y=r*Math.sin(a*2),z=Math.sin(a*3)*.52;
      const xx=x*Math.cos(angle)-z*Math.sin(angle),zz=x*Math.sin(angle)+z*Math.cos(angle),yy=y*Math.cos(tilt)-zz*Math.sin(tilt),depth=y*Math.sin(tilt)+zz*Math.cos(tilt),perspective=3/(3-depth*options.depth*.7);
      points.push({x:width*.5+xx*size*perspective,y:height*.5+yy*size*perspective,z:depth,p:perspective,f:i/n});
    }
    const segments=[];for(let i=0;i<n;i++)segments.push([points[i],points[i+1]]);segments.sort((a,b)=>(a[0].z+a[1].z)-(b[0].z+b[1].z));
    ctx.lineCap='round';ctx.shadowBlur=options.bloom*scale*.4;
    for(const [a,b] of segments){const pulse=.25+.75*Math.pow(.5+.5*Math.cos((a.f-t*.08)*tau),6),alpha=.25+.55*(a.z+1)*.5;ctx.strokeStyle=mixColor(a.f,pulse*alpha);ctx.shadowColor=mixColor(a.f);ctx.lineWidth=options.width*a.p*(.8+pulse*1.5);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
    ctx.shadowBlur=0;
  }
  function constellation(t){
    const count=Math.max(12,Math.round(options.count*quality.particles)),cell=options.linkDistance,grid=new Map(),points=[];
    for(let i=0;i<count;i++){const s=seeds[i],p={x:((s[0]*width+t*(s[2]-.5)*14)%width+width)%width,y:((s[1]*height+t*(s[3]-.5)*12)%height+height)%height,z:s[2]};
      points.push(p);const key=`${Math.floor(p.x/cell)},${Math.floor(p.y/cell)}`;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(i);
    }
    if(pointer.active){const p={x:pointer.x*width,y:(1-pointer.y)*height,z:.8};const key=`${Math.floor(p.x/cell)},${Math.floor(p.y/cell)}`;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(points.length);points.push(p);}
    ctx.lineWidth=options.width*.6;
    for(let i=0;i<points.length;i++){const a=points[i],gx=Math.floor(a.x/cell),gy=Math.floor(a.y/cell);
      for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const j of grid.get(`${gx+dx},${gy+dy}`)||[]){if(j<=i)continue;const b=points[j],d=Math.hypot(a.x-b.x,a.y-b.y);if(d>=cell)continue;ctx.strokeStyle=mixColor((a.z+b.z)*.5,(1-d/cell)**2*.55);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
      ctx.fillStyle=mixColor(a.z,.75);ctx.beginPath();ctx.arc(a.x,a.y,(.8+a.z*1.6)*options.scale,0,tau);ctx.fill();
    }
  }
  function clear(){lastKey='';bolts=[];segments=[];manualStrike=null;strikeStart=-Infinity;lastRender=0;strikeSerial=0;pointer={x:.5,y:.5,active:false};}
  function burst(p={}) {
    const x=p.x??.5,y=p.y??.12;
    if(![x,y].every(Number.isFinite)||x<0||x>1||y<0||y>1)return;
    manualStrike={x:x*width,y:(1-y)*height};
  }
  function makeBolts(index,target=null) {
    const random=mulberry32(options.seed+index*193);
    const clamp=(x)=>Math.max(.01,Math.min(.99,x));
    const start={x:width*clamp(options.strikeOriginX+(random()-.5)*options.strikeWander),y:height*options.strikeOriginY};
    const end=target??{x:width*clamp(options.strikeTargetX+(random()-.5)*options.strikeWander),y:height*options.strikeTargetY};
    bolts=lightningGeometry({seed:options.seed+index*193,start,end,width,height,branches:options.branches,roughness:options.jaggedness,branchSpread:options.branchSpread,branchLength:options.branchLength,tortuosity:options.tortuosity,taper:options.taper});
    segments=[];
    for(const bolt of bolts)for(let part=0;part<6;part++) {
      const first=Math.floor(part*(bolt.path.length-1)/6),last=Math.floor((part+1)*(bolt.path.length-1)/6),path=new Path2D();
      path.moveTo(bolt.path[first].x,bolt.path[first].y);for(let i=first+1;i<=last;i++)path.lineTo(bolt.path[i].x,bolt.path[i].y);
      segments.push({path,weight:bolt.weight*(1-part*.10),depth:bolt.depth});
    }
  }
  function lightning(t) {
    const automatic=['auto','both'].includes(options.strikeTrigger),index=Math.floor(t/options.strikeInterval),key=`${index}:${options.seed}:${options.branches}:${options.jaggedness}:${options.branchSpread}:${options.branchLength}:${options.tortuosity}:${options.taper}:${options.strikeOriginX}:${options.strikeOriginY}:${options.strikeTargetX}:${options.strikeTargetY}:${options.strikeWander}`;
    if(manualStrike){makeBolts(100000+(++strikeSerial),manualStrike);manualStrike=null;strikeStart=t;lastKey=key;}
    else if(automatic&&key!==lastKey){makeBolts(index);lastKey=key;strikeStart=index*options.strikeInterval;}
    const age=t-strikeStart;if(age<0||age>options.strikeDuration*2)return;
    const fade=Math.min(1,age/.018)*(Math.exp(-age/options.strikeDuration*4)+.08*Math.exp(-age/options.strikeDuration*2.5));
    ctx.lineJoin='round';ctx.lineCap='round';
    // A single discharge envelope, no full-screen flash or random per-frame shape.
    for(const segment of segments) {
      const opacity=fade*Math.exp(-age*segment.depth*2)*Math.pow(segment.weight,.35);
      ctx.globalAlpha=opacity*.35;ctx.strokeStyle=options.color;ctx.shadowColor=options.color;ctx.shadowBlur=options.bloom*scale;
      ctx.lineWidth=options.width*2.2*segment.weight;ctx.stroke(segment.path);
      ctx.shadowBlur=0;ctx.globalAlpha=opacity;ctx.strokeStyle=options.color2;ctx.lineWidth=Math.max(.3,options.width*.78*segment.weight);ctx.stroke(segment.path);
    }
    ctx.globalAlpha=1;ctx.shadowBlur=0;
  }
  function blobs(t){
    const count=Math.max(2,Math.min(8,Math.round(options.count/12))),size=Math.min(width,height)*.23*options.scale;
    for(let k=0;k<count;k++){
      const seed=seeds[k],cx=width*(.18+.64*seed[0]),cy=height*(.28+.44*seed[1]);ctx.save();ctx.translate(cx,cy);ctx.rotate(Math.sin(t*.13+k)*.25);
      const grad=ctx.createLinearGradient(-size,-size,size,size);grad.addColorStop(0,options.color);grad.addColorStop(1,options.color2);ctx.fillStyle=grad;ctx.globalAlpha=.68;ctx.beginPath();
      for(let i=0;i<=96;i++){const a=i/96*tau,phase=k*7.13;let radius=size*(.75+.10*Math.sin(a*3+t*.4+phase)+.12*Math.sin(a*5-t*.3+phase));
        if(pointer.active){const px=pointer.x*width-cx,py=(1-pointer.y)*height-cy,d=Math.hypot(px,py);radius+=size*.16*Math.max(0,1-d/(size*2))*Math.cos(a-Math.atan2(py,px));}
        const x=Math.cos(a)*radius,y=Math.sin(a)*radius;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}
      ctx.closePath();ctx.fill();ctx.globalAlpha=.3;ctx.strokeStyle=options.color2;ctx.lineWidth=options.width;ctx.stroke();ctx.restore();
    }
  }
  function jellyfish(t){
    const count=Math.max(1,Math.min(5,Math.round(options.count/30))),detail=Math.max(5,Math.round(10*quality.particles));
    for(let k=0;k<count;k++){
      const s=seeds[k],size=Math.min(width,height)*(.18+s[2]*.08)*options.scale,cx=width*(count===1?.5:.22+.56*k/(count-1)),cy=height*(.36+Math.sin(t*.45+k*2)*.06);
      ctx.save();ctx.translate(cx,cy);const pulse=1+Math.sin(t*1.4+k)*.055;
      ctx.shadowColor=options.color;ctx.shadowBlur=options.bloom*scale*.45;
      for(let j=0;j<detail;j++){
        const x=(j/(detail-1)-.5)*size*1.2;ctx.beginPath();ctx.moveTo(x,0);
        for(let part=1;part<=18;part++){const a=part/18,xx=x+Math.sin(a*8-t*1.1+j)*size*.10*a+Math.sin(a*15+t*.8+j)*size*.04;ctx.lineTo(xx,a*size*(1.25+s[3]));}
        ctx.strokeStyle=mixColor(j/detail,.3+.35*(1-j/detail));ctx.lineWidth=options.width*.8;ctx.stroke();
      }
      const g=ctx.createRadialGradient(-size*.22,-size*.5,1,0,-size*.1,size);g.addColorStop(0,mixColor(.6,.55));g.addColorStop(.65,mixColor(.1,.17));g.addColorStop(1,mixColor(0,.05));
      ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-size*pulse,0);ctx.bezierCurveTo(-size*pulse,-size*1.13,size*pulse,-size*1.13,size*pulse,0);ctx.quadraticCurveTo(0,size*.16,-size*pulse,0);ctx.fill();
      ctx.strokeStyle=mixColor(.35,.7);ctx.lineWidth=options.width;ctx.stroke();
      for(let rib=-2;rib<=2;rib++){ctx.strokeStyle=mixColor((rib+2)/4,.24);ctx.beginPath();ctx.moveTo(0,-size*.84);ctx.quadraticCurveTo(rib*size*.34,-size*.4,rib*size*.44,0);ctx.stroke();}
      ctx.restore();
    }
  }
  function render(time){if(disposed)return;if(time<lastRender)clear();lastRender=time;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.setTransform(scale,0,0,scale,0,0);({orbit,constellation,lightning,blobs,jellyfish})[options.kind](options.interactionMode==='pointer'&&['constellation','blobs'].includes(options.kind)?0:time);ctx.globalAlpha=1;ctx.shadowBlur=0;}
  seed();setOptions(options);
  return{releasable:true,get animated(){if(options.kind==='lightning')return ['auto','both'].includes(options.strikeTrigger)||Boolean(manualStrike)||lastRender-strikeStart<options.strikeDuration*2;return options.interactionMode!=='pointer'||!['constellation','blobs'].includes(options.kind);},canvas,setOptions,resize,render,setPointer(input){const p=cleanPointer(input);if(!allowsPointer('sketch',options))return;pointer=p;if(options.kind==='lightning'&&p.active&&p.event==='pointerdown')burst(p);},burst,clear,suspendInput(){pointer={x:.5,y:.5,active:false};manualStrike=null;},setQuality(q){const change=Math.abs(q.scale-quality.scale)>.1;quality=q;if(change)resize();},getState(){return{backend:'Canvas kinetic geometry',study:options.kind,motionSource:options.interactionMode,strikeTrigger:options.strikeTrigger,lightningChannels:bolts.length,lightningVertices:bolts.reduce((n,b)=>n+b.path.length,0),qualityLevel:quality.name,elements:Math.round(options.count*quality.particles),pixels:[canvas.width,canvas.height]};},destroy(){disposed=true;canvas.remove();canvas.width=canvas.height=1;seeds=[];bolts=[];}};
}
