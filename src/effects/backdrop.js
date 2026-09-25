import {normalizeOptions} from '../core/schema.js';
import {mulberry32,clamp} from '../core/utils.js';
import {createCanvasSurface,rgba,cachedGrain} from '../core/canvas-surface.js';

// === REUSABLE BACKGROUNDS; CACHED SPRITES, GRAIN AND BOUNDED CONTOURS ===
export function createBackdropRenderer(mount,input={}){
  let o=normalizeOptions('backdrop',input),surface=createCanvasSurface(mount,o),seeds=[],grain,sprites=[],lastKey='',lastTime=0,revision=0,paintKey='',paintBuilds=0;
  const {ctx,canvas}=surface,tau=Math.PI*2;
  const colors=()=>[o.color,o.color2,o.color3];
  function rebuild(){
    const key=[o.seed,o.color,o.color2,o.color3,o.softness,o.bokehShape].join('|');if(key===lastKey)return;lastKey=key;
    const random=mulberry32(o.seed);seeds=Array.from({length:80},()=>[random(),random(),random(),random(),random()]);
    if(grain)grain.width=grain.height=1;grain=cachedGrain(o.seed);
    for(const s of sprites)s.width=s.height=1;
    sprites=colors().map(color=>{
      const s=document.createElement('canvas');s.width=s.height=192;const c=s.getContext('2d'),r=86;
      c.save();c.translate(96,96);c.beginPath();
      if(o.bokehShape==='circle')c.arc(0,0,r,0,tau);else{const n=o.bokehShape==='hexagon'?6:8;for(let i=0;i<n;i++){const a=i/n*tau;i?c.lineTo(Math.cos(a)*r,Math.sin(a)*r):c.moveTo(r,0);}c.closePath();}c.clip();
      const g=c.createRadialGradient(0,0,1,0,0,r);g.addColorStop(0,rgba(color,.12));g.addColorStop(.65,rgba(color,.16));g.addColorStop(Math.max(.7,.96-o.softness*.22),rgba(color,.35));g.addColorStop(1,rgba(color,0));c.fillStyle=g;c.fillRect(-96,-96,192,192);c.restore();return s;
    });
  }
  function setOptions(next){const previous=o;o=normalizeOptions('backdrop',next,o);if(Object.keys(o).some(key=>o[key]!==previous[key]))revision++;surface.setOptions(o);rebuild();}
  function mesh(w,h,t,n){
    const palette=colors(),angle=o.angle*Math.PI/180;
    for(let i=0;i<n;i++){const s=seeds[i],x=w*(s[0]+Math.sin(t*.43+s[2]*tau)*o.amplitude*.28),y=h*(s[1]+Math.sin(t*.36+s[3]*tau+angle)*o.amplitude*.28);
      const r=Math.max(w,h)*(.35+s[4]*.28)*o.scale,g=ctx.createRadialGradient(x,y,1,x,y,r);
      g.addColorStop(0,rgba(palette[i%3],.8));g.addColorStop(Math.max(.01,(1-o.softness)*.6),rgba(palette[i%3],.55));g.addColorStop(1,rgba(palette[i%3],0));ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    }
  }
  function bokeh(w,h,t,n){
    const angle=o.angle*Math.PI/180;
    for(let i=0;i<n;i++){const s=seeds[i],r=(18+s[2]*85)*o.scale,x=s[0]*w+Math.sin(t*.35+s[3]*tau)*w*.1*o.amplitude+Math.cos(angle)*Math.sin(t*.18+s[1]*8)*w*.03,y=s[1]*h+Math.sin(t*.24+s[4]*tau)*h*.25*o.amplitude;
      ctx.save();ctx.globalAlpha*=.4+.6*s[2];ctx.drawImage(sprites[i%3],x-r,y-r,r*2,r*2);ctx.restore();
    }
  }
  function beams(w,h,t,n){
    const x=o.lightX*w,y=o.lightY*h,len=Math.hypot(w,h)*1.8,angle=(90+o.angle)*Math.PI/180;
    ctx.save();ctx.translate(x,y);ctx.filter=`blur(${(2+o.softness*15)*surface.scale}px)`;
    for(let i=0;i<n;i++){const s=seeds[i],a=angle+(s[0]-.5)*1.3*o.scale+Math.sin(t*.25+s[1]*tau)*o.amplitude*.06,spread=(.018+s[2]*.10)*o.scale;
      const grad=ctx.createLinearGradient(0,0,Math.cos(a)*len,Math.sin(a)*len);grad.addColorStop(0,rgba(colors()[i%3],.9));grad.addColorStop(.5,rgba(colors()[i%3],.18));grad.addColorStop(1,rgba(colors()[i%3],0));
      ctx.fillStyle=grad;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a-spread)*len,Math.sin(a-spread)*len);ctx.lineTo(Math.cos(a+spread)*len,Math.sin(a+spread)*len);ctx.closePath();ctx.fill();
    }ctx.restore();
  }
  function shadows(w,h,t,n){
    ctx.save();ctx.fillStyle=rgba(o.color,.85);ctx.filter=`blur(${(.3+o.softness*9)*surface.scale}px)`;
    if(o.shadowKind==='leaves'){
      ctx.lineCap='round';ctx.strokeStyle=rgba(o.color,.85);
      for(let i=0;i<n;i++){const s=seeds[i],x=s[0]*w+(o.lightX-.5)*w*.15,y=s[1]*h+o.lightY*h*.15+Math.sin(t*.5+s[4]*tau)*h*.03*o.amplitude;
        const r=(20+s[2]*48)*o.scale,a=o.angle*Math.PI/180+s[3]*tau+Math.sin(t*.4+i)*o.amplitude*.2;
        ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.beginPath();ctx.ellipse(0,0,r,r*.28,0,0,tau);ctx.fill();ctx.lineWidth=Math.max(1,r*.04);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(r*1.8,r*.24);ctx.stroke();ctx.restore();
      }
    }else{
      ctx.translate(w*.5+(o.lightX-.5)*w*.35,h*.5+o.lightY*h*.15);ctx.rotate(o.angle*Math.PI/180+Math.sin(t*.22)*o.amplitude*.015);
      const extent=Math.hypot(w,h)*1.2,panes=o.shadowKind==='blinds'?n:Math.max(2,Math.round(Math.sqrt(n*2))),spacing=extent/Math.max(1,panes)*o.scale;
      ctx.transform(1,0,.28,1,0,0);
      for(let i=-Math.ceil(extent/spacing);i<=Math.ceil(extent/spacing);i++){ctx.fillRect(-extent,i*spacing,extent*2,spacing*(o.shadowKind==='blinds'?.38:.075));if(o.shadowKind==='window')ctx.fillRect(i*spacing,-extent,spacing*.075,extent*2);}
    }ctx.restore();
  }
  function waves(w,h,t,n){
    ctx.save();let length=w,depth=h;
    if(o.edge==='top'){ctx.translate(0,h);ctx.scale(1,-1);}else if(o.edge==='left'){ctx.translate(w,0);ctx.rotate(Math.PI/2);length=h;depth=w;}else if(o.edge==='right'){ctx.translate(0,h);ctx.rotate(-Math.PI/2);length=h;depth=w;}
    const total=Math.min(12,n),palette=colors();
    for(let j=0;j<total;j++){const s=seeds[j],amp=depth*o.amplitude*(.35+j/total*.55),base=depth*clamp(o.baseline+(j-total/2)*.035,0,1);ctx.fillStyle=rgba(palette[j%3],.25+.45*j/total);ctx.beginPath();ctx.moveTo(0,depth);
      for(let i=0;i<=120;i++){const x=i/120*length,u=x/Math.max(1,length),y=base+Math.sin(u*tau*(1.2+o.scale)+t*(.9+s[2])*(j%2?1:-1)+s[3]*tau)*amp+Math.sin(u*tau*3.1-t*.6+j)*amp*.16;ctx.lineTo(x,y);}ctx.lineTo(length,depth);ctx.closePath();ctx.fill();
    }ctx.restore();
  }
  const connections=[[],[[3,0]],[[0,1]],[[3,1]],[[1,2]],[[3,2],[0,1]],[[0,2]],[[3,2]],[[2,3]],[[0,2]],[[0,3],[1,2]],[[1,2]],[[1,3]],[[0,1]],[[3,0]],[]];
  let field=new Float32Array(1),gridW=0,gridH=0;
  const hillData=new Float32Array(40),edgeData=new Float32Array(4);
  function contourEdge(e,x,y,sx,sy,a,b,c,d,iso,offset){
    const v=e===0?a:e===1?b:e===2?c:d,next=e===0?b:e===1?c:e===2?d:a,f=clamp((iso-v)/(next-v||1e-8),0,1);
    edgeData[offset]=x+(e===0?f*sx:e===1?sx:e===2?(1-f)*sx:0);
    edgeData[offset+1]=y+(e===0?0:e===1?f*sy:e===2?sy:(1-f)*sy);
  }
  function contours(w,h,t,n){
    const nx=Math.min(90,Math.max(25,Math.round(60*surface.quality.scale))),ny=Math.min(70,Math.max(18,Math.round(nx*h/w)));
    if(nx!==gridW||ny!==gridH){gridW=nx;gridH=ny;field=new Float32Array((nx+1)*(ny+1));}
    const hills=Math.min(10,n),stepX=w/nx,stepY=h/ny;
    for(let k=0;k<hills;k++){const seed=seeds[k],i=k*4;hillData[i]=(seed[0]+Math.sin(t*.13+seed[3]*tau)*o.amplitude*.13)*w/h;hillData[i+1]=seed[1]+Math.cos(t*.12+seed[4]*tau)*o.amplitude*.13;hillData[i+2]=.45+seed[2]*.55;hillData[i+3]=(8+seed[3]*12)/o.scale;}
    for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++){let z=0;const u=x/nx*w/h,v=y/ny;for(let k=0;k<hills;k++){const i=k*4,dx=u-hillData[i],dy=v-hillData[i+1];z+=hillData[i+2]*Math.exp(-(dx*dx+dy*dy)*hillData[i+3]);}field[y*(nx+1)+x]=z;}
    const levels=Math.min(32,Math.max(4,Math.round(h/o.spacing)));
    ctx.lineWidth=o.lineWidth;ctx.lineJoin='round';
    for(let l=1;l<=levels;l++){const iso=l/levels*1.2;ctx.beginPath();ctx.strokeStyle=rgba(l%3?o.color:o.color2,.6);
      for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const i=y*(nx+1)+x,a=field[i],b=field[i+1],c=field[i+nx+2],d=field[i+nx+1],code=(a>iso?1:0)|(b>iso?2:0)|(c>iso?4:0)|(d>iso?8:0);if(!code||code===15)continue;
        for(const pair of connections[code]){contourEdge(pair[0],x*stepX,y*stepY,stepX,stepY,a,b,c,d,iso,0);contourEdge(pair[1],x*stepX,y*stepY,stepX,stepY,a,b,c,d,iso,2);ctx.moveTo(edgeData[0],edgeData[1]);ctx.lineTo(edgeData[2],edgeData[3]);}
      }ctx.stroke();
    }
  }
  function render(time){
    if(!Number.isFinite(time)||surface.disposed)return;lastTime=time;const next=[revision,surface.width,surface.height,surface.scale,surface.quality.particles,time*o.driftSpeed].join('|');if(next===paintKey)return;paintKey=next;paintBuilds++;if(!surface.begin())return;const w=surface.width,h=surface.height,n=Math.max(1,Math.min(80,Math.round(o.count*surface.quality.particles))),t=time*o.driftSpeed;
    ctx.save();surface.clip();if(!o.transparent){ctx.fillStyle=o.background;ctx.fillRect(0,0,w,h);}ctx.globalAlpha=clamp(o.intensity,0,1);
    ({mesh,bokeh,beams,shadows,waves,contours})[o.kind](w,h,t,n);ctx.globalAlpha=1;
    if(o.grain>0){ctx.save();ctx.globalAlpha=o.grain;ctx.globalCompositeOperation='soft-light';ctx.fillStyle=ctx.createPattern(grain,'repeat');ctx.fillRect(0,0,w,h);ctx.restore();}
    if(o.vignette>0){const g=ctx.createRadialGradient(w*.5,h*.45,Math.min(w,h)*.2,w*.5,h*.5,Math.hypot(w,h)*.6);g.addColorStop(0,'transparent');g.addColorStop(1,`rgba(0,0,0,${o.vignette})`);ctx.fillStyle=g;ctx.fillRect(0,0,w,h);}ctx.restore();
  }
  rebuild();return{releasable:true,canvas,setOptions,render,resize:(w,h)=>{revision++;return surface.resize(w,h);},setQuality:q=>surface.setQuality(q),get animated(){return o.driftSpeed>0&&o.intensity>0;},get maxFPS(){return o.kind==='contours'?30:60;},getState(){return{backend:'Canvas layered backdrop',kind:o.kind,cacheSprites:sprites.length,paintBuilds,effectiveElements:Math.max(1,Math.round(o.count*surface.quality.particles)),time:lastTime,...surface.getState()};},destroy(){surface.destroy();seeds=[];field=new Float32Array(0);for(const s of sprites)s.width=s.height=1;sprites=[];if(grain)grain.width=grain.height=1;grain=null;}};
}
