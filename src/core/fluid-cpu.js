import {decorate} from './utils.js';

// === SMALL-GRID PORTABLE SOLVER FOR DEVICES WITHOUT FLOAT WEBGL TARGETS ===
export class CpuFluid{
  constructor(mount){this.canvas=decorate(document.createElement('canvas'),{position:'absolute',inset:'0',width:'100%',height:'100%',borderRadius:'inherit',pointerEvents:'none'});this.ctx=this.canvas.getContext('2d');this.imageCanvas=document.createElement('canvas');this.imageCtx=this.imageCanvas.getContext('2d');mount.append(this.canvas);this.w=0;this.h=0;}
  sample(a,x,y,w=this.w,h=this.h){x=Math.max(0,Math.min(w-1.001,x));y=Math.max(0,Math.min(h-1.001,y));const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,i=iy*w+ix;return(a[i]*(1-fx)+a[i+1]*fx)*(1-fy)+(a[i+w]*(1-fx)+a[i+w+1]*fx)*fy;}
  resizeGrid(w,h){
    if(w===this.w&&h===this.h)return;const old={w:this.w,h:this.h,vx:this.vx,vy:this.vy,r:this.r,g:this.g,b:this.b};this.w=w;this.h=h;this.n=w*h;
    for(const key of ['vx','vy','r','g','b','tx','ty','tr','tg','tb','pressure','pressure2','divergence','curl'])this[key]=new Float32Array(this.n);
    if(old.w>1&&old.h>1)for(let y=0;y<h;y++)for(let x=0;x<w;x++)for(const k of ['vx','vy','r','g','b'])this[k][y*w+x]=this.sample(old[k],x/(w-1)*(old.w-1),y/(h-1)*(old.h-1),old.w,old.h);
    this.imageCanvas.width=w;this.imageCanvas.height=h;this.image=this.imageCtx.createImageData(w,h);
  }
  resizeCanvas(w,h){this.canvas.width=w;this.canvas.height=h;}
  splat(x,y,dx,dy,color,radius,aspect){
    for(let j=0;j<this.h;j++)for(let i=0;i<this.w;i++){const xx=(i/Math.max(1,this.w-1)-x)*aspect,yy=j/Math.max(1,this.h-1)-y,d=(xx*xx+yy*yy)/(radius*radius);if(d>9)continue;const weight=Math.exp(-d),k=j*this.w+i;this.vx[k]+=dx*weight;this.vy[k]+=dy*weight;this.r[k]+=color[0]*weight;this.g[k]+=color[1]*weight;this.b[k]+=color[2]*weight;}
  }
  advect(source,target,vx,vy,dt,damping){const fade=Math.exp(-damping*dt);for(let y=0;y<this.h;y++)for(let x=0;x<this.w;x++){const i=y*this.w+x;target[i]=this.sample(source,x-vx[i]*dt*this.w,y-vy[i]*dt*this.h)*fade;}}
  step(dt,o){
    const {w,h}=this;this.advect(this.vx,this.tx,this.vx,this.vy,dt,o.viscosity);this.advect(this.vy,this.ty,this.vx,this.vy,dt,o.viscosity);[this.vx,this.tx]=[this.tx,this.vx];[this.vy,this.ty]=[this.ty,this.vy];
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;this.curl[i]=(this.vy[i+1]-this.vy[i-1])*w*.5-(this.vx[i+w]-this.vx[i-w])*h*.5;}
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x,gx=(Math.abs(this.curl[i+1])-Math.abs(this.curl[i-1]))*w,gy=(Math.abs(this.curl[i+w])-Math.abs(this.curl[i-w]))*h,length=Math.hypot(gx,gy)||1,force=this.curl[i]*o.vorticity*.0004*dt;this.vx[i]=Math.max(-4,Math.min(4,this.vx[i]+gy/length*force));this.vy[i]=Math.max(-4,Math.min(4,this.vy[i]-gx/length*force+Math.max(this.r[i],this.g[i],this.b[i])*o.buoyancy*dt*.14));}
    this.pressure.fill(0);this.divergence.fill(0);
    for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;this.divergence[i]=(this.vx[i+1]-this.vx[i-1])*w*.5+(this.vy[i+w]-this.vy[i-w])*h*.5;}
    const hx=1/(w*w),hy=1/(h*h);
    for(let k=0;k<Math.min(18,o.pressureIterations);k++){for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;this.pressure2[i]=((this.pressure[i-1]+this.pressure[i+1])*hy+(this.pressure[i-w]+this.pressure[i+w])*hx-this.divergence[i]*hx*hy)/(2*(hx+hy));}[this.pressure,this.pressure2]=[this.pressure2,this.pressure];}
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=y*w+x;if(x===0||x===w-1||y===0||y===h-1){this.vx[i]=this.vy[i]=0;continue;}this.vx[i]-=(this.pressure[i+1]-this.pressure[i-1])*w*.5;this.vy[i]-=(this.pressure[i+w]-this.pressure[i-w])*h*.5;}
    for(const [s,t]of [['r','tr'],['g','tg'],['b','tb']]){this.advect(this[s],this[t],this.vx,this.vy,dt,o.dissipation);[this[s],this[t]]=[this[t],this[s]];}
  }
  display(o,color){
    const data=this.image.data,clamp=v=>Math.max(0,Math.min(1,v)),smooth=(a,b,t)=>{const f=clamp((t-a)/(b-a));return f*f*(3-2*f);};
    for(let y=0;y<this.h;y++)for(let x=0;x<this.w;x++){
      const i=y*this.w+x,j=((this.h-1-y)*this.w+x)*4,density=Math.max(this.r[i],this.g[i],this.b[i]);let r=1-Math.exp(-this.r[i]),g=1-Math.exp(-this.g[i]),b=1-Math.exp(-this.b[i]);
      if(o.kind==='smoke'){const neighbor=Math.max(this.r[Math.min(this.n-1,i+this.w)],0),shade=clamp(.85-(density-neighbor)*o.shading*.25-density*.08);r=color[0]*shade;g=color[1]*shade;b=color[2]*shade;}
      else if(o.kind==='fire'){const hot=1-Math.exp(-density*.48),a=smooth(.015,.5,hot),orange=smooth(.5,.85,hot),core=smooth(.89,1,hot)*.65;r=.43+(.98-.43)*a;g=.012+(.21-.012)*a;b=.001+(.012-.001)*a;r=r*(1-orange)+orange;g=g*(1-orange)+.6*orange;b=b*(1-orange)+.1*orange;r=r*(1-core)+core;g=g*(1-core)+.9*core;b=b*(1-core)+.58*core;}
      else if(o.kind==='neon'){r*=1.5;g*=1.5;b*=1.5;}
      data[j]=clamp(r)*255;data[j+1]=clamp(g)*255;data[j+2]=clamp(b)*255;data[j+3]=(o.kind==='fire'?(1-Math.exp(-density*.85))*smooth(.015,.12,1-Math.exp(-density*.48)):1-Math.exp(-density*1.3))*255;
    }
    this.imageCtx.putImageData(this.image,0,0);this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);this.ctx.drawImage(this.imageCanvas,0,0,this.canvas.width,this.canvas.height);
  }
  clear(){for(const key of ['vx','vy','r','g','b','tx','ty','tr','tg','tb','pressure','pressure2','divergence','curl'])this[key].fill(0);}
  destroy(){this.canvas.remove();this.canvas.width=this.canvas.height=this.imageCanvas.width=this.imageCanvas.height=1;for(const key of ['vx','vy','r','g','b','tx','ty','tr','tg','tb','pressure','pressure2','divergence','curl','image'])this[key]=null;}
}
