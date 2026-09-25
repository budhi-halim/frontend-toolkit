import {normalizeOptions} from '../core/schema.js';
import {mulberry32,clamp} from '../core/utils.js';
import {createCanvasSurface,rgba} from '../core/canvas-surface.js';

// === CACHED EDITORIAL PATTERNS; STATIC BY DEFAULT ===
export function createPatternRenderer(mount,input={}){
  let o=normalizeOptions('pattern',input),surface=createCanvasSurface(mount,o),version=0,painted='',tileKey='',builds=0,paintBuilds=0;
  const {canvas,ctx}=surface,tile=document.createElement('canvas'),ink=document.createElement('canvas'),tc=tile.getContext('2d'),ic=ink.getContext('2d');
  let tileWidth=1,tileHeight=1;
  function tileTexture(){
    const key=[o.kind,o.color,o.color2,o.spacing,o.size,o.lineWidth,o.jitter,o.alternate,o.seed].join('|');if(key===tileKey)return;tileKey=key;builds++;
    const random=mulberry32(o.seed),s=o.spacing,units=6;
    tileWidth=units*s;tileHeight=units*s;
    if(o.kind==='hexagons'){tileWidth=6*Math.sqrt(3)*s/2;tileHeight=6*1.5*s/2;}
    const d=Math.min(2,1536/Math.max(tileWidth,tileHeight));tile.width=Math.max(1,Math.round(tileWidth*d));tile.height=Math.max(1,Math.round(tileHeight*d));tc.setTransform(tile.width/tileWidth,0,0,tile.height/tileHeight,0,0);tc.clearRect(0,0,tileWidth,tileHeight);
    tc.strokeStyle=o.color;tc.fillStyle=o.color;tc.lineWidth=o.lineWidth;tc.lineCap='round';tc.beginPath();
    if(o.kind==='grid'){
      for(let i=0;i<=units;i++){tc.moveTo(i*s,0);tc.lineTo(i*s,tileHeight);tc.moveTo(0,i*s);tc.lineTo(tileWidth,i*s);}tc.stroke();
    }else if(o.kind==='diagonal'){
      for(let i=-units;i<=units*2;i++){tc.moveTo(i*s,0);tc.lineTo(i*s-tileHeight,tileHeight);}tc.stroke();
    }else if(o.kind==='hexagons'){
      const r=s/2,dx=Math.sqrt(3)*r,dy=1.5*r;
      for(let y=-1;y<=6;y++)for(let x=-1;x<=6;x++){const cx=(x+(y%2? .5:0))*dx,cy=y*dy;
        for(let k=0;k<6;k++){const a=(k+.5)*Math.PI/3,px=cx+Math.cos(a)*r,py=cy+Math.sin(a)*r;k?tc.lineTo(px,py):tc.moveTo(px,py);}tc.closePath();}tc.stroke();
    }else{
      for(let y=0;y<units;y++)for(let x=0;x<units;x++){
        const cx=(x+.5+(random()-.5)*o.jitter)*s,cy=(y+.5+(random()-.5)*o.jitter)*s;
        if(o.kind==='dots'){tc.beginPath();tc.arc(cx,cy,Math.min(o.size,s*.45),0,Math.PI*2);tc.fill();}
        else if(o.kind==='crosses'){const r=Math.min(o.size,s*.4);tc.beginPath();tc.moveTo(cx-r,cy);tc.lineTo(cx+r,cy);tc.moveTo(cx,cy-r);tc.lineTo(cx,cy+r);tc.stroke();}
        else if(o.kind==='tiles'){
          tc.save();tc.translate(x*s,y*s);tc.strokeStyle=(x+y)%2?o.color:o.color2;
          const flip=o.alternate?random()>.5:false;if(flip){tc.translate(s,0);tc.scale(-1,1);}tc.beginPath();tc.arc(0,0,s/2,0,Math.PI/2);tc.stroke();tc.beginPath();tc.arc(s,s,s/2,Math.PI,Math.PI*1.5);tc.stroke();tc.restore();
        }else if(o.kind==='arches'){
          tc.save();tc.translate(x*s,y*s);if(o.alternate&&(x+y)%2){tc.translate(s,s);tc.rotate(Math.PI);}tc.strokeStyle=(x+y)%2?o.color:o.color2;
          for(let k=0;k<3;k++){tc.beginPath();tc.arc(s/2,s*.65,s*(.42-k*.105),Math.PI,Math.PI*2);tc.stroke();}tc.restore();
        }
      }
    }
  }
  function paint(time){
    paintBuilds++;
    const w=surface.width,h=surface.height,scale=surface.scale;
    if(ink.width!==canvas.width||ink.height!==canvas.height){ink.width=canvas.width;ink.height=canvas.height;}
    ic.setTransform(1,0,0,1,0,0);ic.clearRect(0,0,ink.width,ink.height);ic.setTransform(scale,0,0,scale,0,0);ic.globalCompositeOperation='source-over';ic.globalAlpha=1;
    ic.save();ic.translate(w/2,h/2);ic.rotate(o.angle*Math.PI/180);const extent=Math.hypot(w,h);
    if(o.kind==='halftone'){
      let spacing=o.spacing;spacing*=Math.max(1,Math.sqrt((extent/spacing)**2/24000));
      const x0=-extent/2+((time*o.driftX)%spacing+spacing)%spacing,y0=-extent/2+((time*o.driftY)%spacing+spacing)%spacing;
      for(let y=y0;y<=extent/2;y+=spacing)for(let x=x0;x<=extent/2;x+=spacing){const u=clamp((x+w/2-time*o.driftX)/w,0,1),v=clamp((y+h/2-time*o.driftY)/h,0,1),field=.5+.5*Math.cos(u*Math.PI*1.4+Math.sin(v*Math.PI)*.45),size=Math.min(spacing*.47,o.size)*(1-o.halftoneContrast+field*o.halftoneContrast);
        ic.fillStyle=field>.5?o.color:o.color2;ic.beginPath();ic.arc(x,y,Math.max(.05,size),0,Math.PI*2);ic.fill();}
    }else{
      const pattern=ic.createPattern(tile,'repeat');
      const sx=tileWidth/tile.width,sy=tileHeight/tile.height,transform=pattern?.setTransform&&typeof DOMMatrix==='function';
      if(transform)pattern.setTransform(new DOMMatrix().scale(sx,sy));
      ic.translate((time*o.driftX)%tileWidth,(time*o.driftY)%tileHeight);ic.fillStyle=pattern;
      if(!transform){ic.scale(sx,sy);ic.fillRect((-extent-tileWidth)/sx,(-extent-tileHeight)/sy,(extent*2+tileWidth*2)/sx,(extent*2+tileHeight*2)/sy);}
      else ic.fillRect(-extent-tileWidth,-extent-tileHeight,extent*2+tileWidth*2,extent*2+tileHeight*2);
    }ic.restore();
    if(o.fade!=='none'&&o.fadeStrength>0){let gradient;
      if(o.fade==='radial')gradient=ic.createRadialGradient(w*.5,h*.5,Math.min(w,h)*.05,w*.5,h*.5,Math.hypot(w,h)*.53);
      else{const horizontal=['left','right'].includes(o.fade),reverse=['left','top'].includes(o.fade);gradient=ic.createLinearGradient(horizontal?(reverse?w:0):0,horizontal?0:(reverse?h:0),horizontal?(reverse?0:w):0,horizontal?0:(reverse?0:h));}
      gradient.addColorStop(0,'rgba(0,0,0,1)');gradient.addColorStop(1,`rgba(0,0,0,${1-o.fadeStrength})`);ic.globalCompositeOperation='destination-in';ic.fillStyle=gradient;ic.fillRect(0,0,w,h);ic.globalCompositeOperation='source-over';
    }
  }
  function render(time){
    if(surface.disposed||!Number.isFinite(time))return;const moving=o.driftX!==0||o.driftY!==0,key=[version,canvas.width,canvas.height,moving?time:0].join('|');if(key===painted)return;painted=key;tileTexture();paint(time);surface.begin();ctx.save();surface.clip();if(!o.transparent){ctx.fillStyle=o.background;ctx.fillRect(0,0,surface.width,surface.height);}ctx.drawImage(ink,0,0,ink.width,ink.height,0,0,surface.width,surface.height);ctx.restore();
  }
  return{releasable:true,canvas,get animated(){return o.driftX!==0||o.driftY!==0;},render,
    setOptions(next){const old=o;o=normalizeOptions('pattern',next,o);if(Object.keys(o).some(k=>o[k]!==old[k]))version++;surface.setOptions(o);},
    resize(w,h){surface.resize(w,h);version++;},setQuality(q){if(surface.setQuality(q))version++;},
    getState(){return{backend:'Cached Canvas pattern',kind:o.kind,tileBuilds:builds,paintBuilds,tilePixels:[tile.width,tile.height],...surface.getState()};},
    destroy(){surface.destroy();tile.width=tile.height=ink.width=ink.height=1;}
  };
}
