import {normalizeOptions} from '../core/schema.js';
import {decorate,colorRGB} from '../core/utils.js';
import {createRainSystem} from '../core/rain-system.js';

// === NATIVE CANVAS RAIN: BATCHED SHUTTER STREAKS, NOT A FULL-SCREEN PIXEL SHADER ===
export function createRainRenderer(mount,input={}) {
  let options=normalizeOptions('field',input),width=1,height=1,scale=1,quality={scale:1,particles:1,name:'Full'},disposed=false;
  const system=createRainSystem(options),groups=Array.from({length:8},()=>[]);
  const canvas=decorate(document.createElement('canvas'),{position:'absolute',inset:'0',width:'100%',height:'100%',borderRadius:'inherit',pointerEvents:'none'});
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas 2D is unavailable.');mount.append(canvas);
  let primary=colorRGB(options.color2),background=colorRGB(options.color);
  function resize(w=width,h=height) {
    width=Math.max(1,w);height=Math.max(1,h);system.resize(width,height);
    scale=Math.min(globalThis.devicePixelRatio||1,options.dprCap)*Math.sqrt(options.quality)*quality.scale;
    scale*=Math.min(1,2048/(width*scale),2048/(height*scale),Math.sqrt(1250000/(width*height*scale*scale)));
    const cw=Math.max(1,Math.floor(width*scale)),ch=Math.max(1,Math.floor(height*scale));
    if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}
    canvas.style.opacity=String(options.opacity);
  }
  function setOptions(next){options=normalizeOptions('field',next,options);system.setOptions(options);primary=colorRGB(options.color2);background=colorRGB(options.color);resize();}
  function render(time) {
    if(disposed)return;system.step(time);
    ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.setTransform(scale,0,0,scale,0,0);
    if(!options.transparent){ctx.fillStyle=`rgb(${background.map(x=>Math.round(x*36)).join(',')})`;ctx.fillRect(0,0,width,height);}
    for(const group of groups)group.length=0;
    for(const p of system.drops)groups[Math.min(7,Math.floor(p.depth*8))].push(p);
    const rgb=primary.map(x=>Math.round(x*255)).join(',');ctx.lineCap='round';
    for(let g=7;g>=0;g--) {
      const depth=(g+.5)/8,factor=1-options.rainDepth*.66*depth;
      ctx.strokeStyle=`rgba(${rgb},${Math.min(1,(.13+.32*(1-depth))*options.intensity)})`;
      ctx.lineWidth=Math.max(.35,options.rainWidth*factor);
      for(let pass=0;pass<2;pass++) {
        ctx.globalAlpha=pass===0?.38:.65;ctx.beginPath();
        for(const p of groups[g]) {
          const shutter=options.rainLength/620*p.size,part=pass===0?1:.4;
          const tx=p.x-p.vx*shutter*part,ty=p.y-p.vy*shutter*part;
          ctx.moveTo(tx,ty);ctx.lineTo(p.x,p.y+.12);
        }
        ctx.stroke();
      }
    }
    ctx.globalAlpha=1;
  }
  resize();
  return {releasable:true,canvas,get animated(){return options.rainDensity>0&&options.fallbackAnimation!=='static'&&(options.rainSpeed>0||options.rainWind!==0||options.rainGust>0);},
    get maxFPS(){return options.forceFallback?options.fallbackFPS:null;},setOptions,resize,render,
    setQuality(q){const changed=Math.abs(q.scale-quality.scale)>.08;quality=q;system.setQuality(q.particles);if(changed)resize();},
    clear(){system.reset();},getState(){return{backend:'Canvas layered rain',qualityLevel:quality.name,pixels:[canvas.width,canvas.height],...system.getState(),fidelity:'Depth-layered particle approximation; native Canvas on every device'};},
    destroy(){if(disposed)return;disposed=true;system.setOptions({...options,rainDensity:0});canvas.remove();canvas.width=canvas.height=1;groups.forEach(g=>g.length=0);}};
}
