import {normalizeOptions} from '../core/schema.js';
import {clamp,mulberry32} from '../core/utils.js';
import {roundedPath} from '../core/geometry.js';
import {skeletonShapes,ringGeometry} from '../core/status-geometry.js';
import {createCanvasSurface,rgba,roundedFill} from '../core/canvas-surface.js';

// === DECORATIVE LOADING / PROGRESS DRAWING; APPLICATION OWNS THE REAL STATE ===
// No fake network progress, microphone access, roles or live-region announcements.
export function createStatusRenderer(mount,input={}){
  let o=normalizeOptions('status',input),surface=createCanvasSurface(mount,o),shapes=[],key='',phases=[],mask=null,geometryBuilds=0;
  const {ctx,canvas}=surface,tau=Math.PI*2;
  function geometry(){
    const next=[surface.width,surface.height,o.kind,o.width,o.anchorX,o.anchorY,o.skeletonLayout,o.lines,o.gap,o.lineHeight,o.avatarSize,o.avatarGap,o.radius,o.seed].join('|');if(next===key)return;key=next;
    geometryBuilds++;const random=mulberry32(o.seed);phases=Array.from({length:40},()=>random()*tau);shapes=[];mask=null;
    if(o.kind!=='skeleton')return;
    shapes=skeletonShapes(surface.width,surface.height,o);
    mask=new Path2D();for(const s of shapes)roundedPath(mask,s.x,s.y,s.w,s.h,s.r);
  }
  function skeleton(t,w,h){
    const path=mask;ctx.fillStyle=o.trackColor;ctx.fill(path);
    if(o.shimmer){ctx.save();ctx.clip(path);const pos=(t%1)*(w*1.6)-w*.3,g=ctx.createLinearGradient(pos-w*.18,0,pos+w*.18,0);g.addColorStop(0,'transparent');g.addColorStop(.5,rgba(o.color,.27));g.addColorStop(1,'transparent');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);ctx.restore();}
  }
  function ring(t,x,y){
    const {radius:r,thickness}=ringGeometry(surface.width,surface.height,o),start=o.angle*Math.PI/180,sweep=o.sweep*Math.PI/180,direction=o.reverse?-1:1;
    if(r<=0)return;
    ctx.lineCap=o.lineCap;ctx.lineWidth=thickness;ctx.strokeStyle=o.trackColor;ctx.beginPath();ctx.arc(x,y,r,start,start+direction*sweep,direction<0);ctx.stroke();
    ctx.strokeStyle=o.color;const offset=o.indeterminate?t*tau*direction:0,span=o.indeterminate?sweep*(.12+.3*(.5+.5*Math.sin(t*tau))):sweep*o.value;
    if(span<=0)return;ctx.beginPath();ctx.arc(x,y,r,start+offset,start+offset+direction*span,direction<0);ctx.stroke();
  }
  function bar(t,x,y,w,segmented=false){
    const length=w*o.width,left=x-length/2,h=o.thickness;
    if(segmented){const n=o.count,gap=Math.min(o.gap,length/Math.max(n,1)*.8),cell=Math.max(.1,(length-gap*(n-1))/n);for(let i=0;i<n;i++){ctx.fillStyle=o.trackColor;roundedFill(ctx,left+i*(cell+gap),y-h/2,cell,h,o.radius);const amount=o.indeterminate?Math.max(0,1-Math.abs(((i/n-t)%1+1)%1-.25)*5):clamp(o.value*n-i,0,1);if(amount>0){ctx.save();ctx.beginPath();roundedPath(ctx,left+i*(cell+gap),y-h/2,cell,h,o.radius);ctx.clip();ctx.fillStyle=o.color;ctx.fillRect(left+i*(cell+gap),y-h/2,cell*amount,h);ctx.restore();}}}
    else{ctx.fillStyle=o.trackColor;roundedFill(ctx,left,y-h/2,length,h,o.radius);ctx.save();ctx.beginPath();roundedPath(ctx,left,y-h/2,length,h,o.radius);ctx.clip();const gradient=ctx.createLinearGradient(left,0,left+length,0);gradient.addColorStop(0,o.color);gradient.addColorStop(1,o.color2);ctx.fillStyle=gradient;if(o.indeterminate)ctx.fillRect(left+((t%1)*1.35-.35)*length,y-h/2,length*.35,h);else ctx.fillRect(left,y-h/2,length*o.value,h);ctx.restore();}
  }
  function dots(t,x,y){
    const n=o.count,span=o.size,cell=span/Math.max(1,n-1),radius=Math.min(7,span/n*.26);
    for(let i=0;i<n;i++){const a=.5+.5*Math.sin(t*tau-i*.7),yy=y-(a-.5)*o.amplitude*span*.25;ctx.fillStyle=rgba(i%2?o.color:o.color2,.675+.65*(a-.5)*o.amplitude);ctx.beginPath();ctx.arc(x-span/2+i*cell,yy,Math.max(.4,radius*(1-o.amplitude*.3+a*o.amplitude*.3)),0,tau);ctx.fill();}
  }
  function equalizer(t,x,y){
    const n=o.count,span=o.size,cell=span/n,gap=Math.min(o.gap,cell*.8),w=Math.max(.25,cell-gap);
    for(let i=0;i<n;i++){const a=.5+.5*Math.sin(t*tau*(.6+i/n*.8)+phases[i]),h=span*(.14+.66*(1-o.amplitude+o.amplitude*a));ctx.fillStyle=i%3?o.color:o.color2;roundedFill(ctx,x-span/2+i*cell,y-h/2,w,h,o.radius);}
  }
  function render(time){if(!Number.isFinite(time)||!surface.begin())return;geometry();const w=surface.width,h=surface.height,x=w*o.anchorX,y=h*o.anchorY,t=time/o.cycle*(o.reverse?-1:1);
    ctx.save();surface.clip();if(o.kind==='skeleton')skeleton(((t%1)+1)%1,w,h);else if(o.kind==='ring')ring(time/o.cycle,x,y);else if(o.kind==='bar'||o.kind==='segments')bar(((t%1)+1)%1,x,y,w,o.kind==='segments');else if(o.kind==='dots')dots(t,x,y);else equalizer(t,x,y);ctx.restore();}
  return{releasable:true,canvas,render,setOptions(next){o=normalizeOptions('status',next,o);surface.setOptions(o);},resize:(w,h)=>surface.resize(w,h),setQuality:q=>surface.setQuality(q),
    get animated(){return o.kind==='skeleton'?o.shimmer:['ring','bar','segments'].includes(o.kind)?o.indeterminate:o.amplitude>0;},
    getState(){return{backend:'Canvas status decoration',kind:o.kind,value:['ring','bar','segments'].includes(o.kind)&&!o.indeterminate?o.value:null,indeterminate:o.indeterminate,applicationControlsProgress:true,trackSweep:o.sweep,geometryBuilds,...surface.getState()};},destroy(){surface.destroy();shapes=[];phases=[];mask=null;}
  };
}
