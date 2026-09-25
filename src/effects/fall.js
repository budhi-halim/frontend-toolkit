import {normalizeOptions} from '../core/schema.js';
import {createCanvasSurface} from '../core/canvas-surface.js';
import {createFallSystem} from '../core/fall-system.js';
import {createFallSprites} from '../core/fall-sprites.js';

// === DEPTH-LAYERED SNOW, LEAVES, PETALS AND SEEDS ===
export function createFallRenderer(mount,input={}){
  let o=normalizeOptions('fall',input),sprites=null,spriteKey='',spriteBuilds=0,disposed=false;
  const surface=createCanvasSurface(mount,o),system=createFallSystem(o),groups=Array.from({length:8},()=>[]),{canvas,ctx}=surface;
  function texture(){
    const key=[o.kind,o.shape,o.colorMode,o.color,o.color2,o.color3,o.softness].join('|');if(key===spriteKey)return;
    const next=createFallSprites(o);sprites?.destroy();sprites=next;spriteKey=key;spriteBuilds++;
  }
  function resize(w=surface.width,h=surface.height){surface.resize(w,h);system.resize(surface.width,surface.height);}
  function render(time){
    if(disposed||!Number.isFinite(time)||time<0||!surface.begin())return;
    texture();system.step(time);ctx.save();surface.clip();
    if(!o.transparent){ctx.fillStyle=o.background;ctx.fillRect(0,0,surface.width,surface.height);}
    for(const group of groups)group.length=0;
    for(const p of system.particles)groups[Math.min(7,Math.floor(p.depth*8))].push(p);
    for(let group=7;group>=0;group--)for(const p of groups[group]){
      const z=system.factor(p),size=o.size*(1-o.sizeVariation*(1-p.size))*z;
      const sprite=sprites.get(p.shape,p.palette);if(!sprite||size<=0)continue;
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rotation);
      if(o.kind==='leaves'||o.kind==='petals'){
        const flutter=system.time*o.tumble*(.7+Math.abs(p.turn))+p.flutter;
        ctx.scale(.16+.84*Math.abs(Math.cos(flutter)),.76+.24*Math.abs(Math.sin(flutter*.7)));
      }
      ctx.globalAlpha=(.4+.6*z)*(o.kind==='seeds'?.92:1);
      ctx.drawImage(sprite,-size/2,-size/2,size,size);ctx.restore();
    }
    ctx.restore();
  }
  return{releasable:true,canvas,render,resize,
    get animated(){return o.density>0&&o.maxParticles>0&&o.fallbackAnimation!=='static'&&(o.fallSpeed>0||o.wind!==0||o.gust>0||o.sway>0&&o.swaySpeed>0||o.tumble>0);},
    get maxFPS(){return o.forceFallback?o.fallbackFPS:null;},
    setOptions(next){o=normalizeOptions('fall',next,o);surface.setOptions(o);system.setOptions(o);},
    setQuality(q){surface.setQuality(q);system.setQuality(q?.particles??1);},
    clear(){system.reset();},
    getState(){return{backend:'Canvas falling particles',...surface.getState(),...system.getState(),spriteBuilds,spriteCount:sprites?.size??0,pointerInteraction:false};},
    destroy(){if(disposed)return;disposed=true;surface.destroy();system.destroy();sprites?.destroy();sprites=null;for(const g of groups)g.length=0;}
  };
}
