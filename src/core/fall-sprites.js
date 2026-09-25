import {FALL_SHAPES} from './fall-schema.js';

// === ORIGINAL VECTOR SPRITES, RASTERIZED ONLY WHEN THE PALETTE OR SHAPE CHANGES ===
function polygon(ctx,points){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();}
function snow(ctx,shape,variant){
  if(shape==='round'){
    const g=ctx.createRadialGradient(-.06,-.08,.04,0,0,.43);g.addColorStop(0,'#ffffff');g.addColorStop(.58,ctx.fillStyle);g.addColorStop(1,'#ffffff00');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,.43,0,Math.PI*2);ctx.fill();return;
  }
  if(shape==='crystal'){
    polygon(ctx,Array.from({length:6},(_,i)=>[Math.cos(i*Math.PI/3)*.34,Math.sin(i*Math.PI/3)*.34]));ctx.globalAlpha=.36;ctx.fill();ctx.globalAlpha=.95;ctx.lineWidth=.025;ctx.stroke();
    for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*.34,Math.sin(a)*.34);ctx.stroke();}return;
  }
  ctx.lineWidth=.025;ctx.lineCap='round';ctx.lineJoin='round';
  for(let i=0;i<6;i++){
    ctx.save();ctx.rotate(i*Math.PI/3);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-.43);
    for(const s of [variant===1?.2:.16,.3]){const len=s===.3?.08:.12;ctx.moveTo(-len,-s+len*.8);ctx.lineTo(0,-s);ctx.lineTo(len,-s+len*.8);}
    ctx.stroke();ctx.restore();
  }
}
function leaf(ctx,shape){
  if(shape==='maple')polygon(ctx,[[0,.38],[-.1,.18],[-.32,.23],[-.24,.06],[-.43,-.08],[-.28,-.13],[-.32,-.29],[-.13,-.21],[0,-.46],[.13,-.21],[.32,-.29],[.28,-.13],[.43,-.08],[.24,.06],[.32,.23],[.1,.18]]);
  else if(shape==='oak'){
    ctx.beginPath();ctx.moveTo(0,.42);ctx.bezierCurveTo(-.1,.34,-.2,.31,-.16,.2);ctx.bezierCurveTo(-.4,.2,-.36,.02,-.21,.01);ctx.bezierCurveTo(-.43,-.1,-.3,-.24,-.15,-.19);ctx.bezierCurveTo(-.27,-.36,-.05,-.48,0,-.46);ctx.bezierCurveTo(.07,-.48,.28,-.34,.14,-.19);ctx.bezierCurveTo(.31,-.22,.4,-.05,.21,.01);ctx.bezierCurveTo(.4,.04,.32,.22,.16,.2);ctx.bezierCurveTo(.22,.32,.1,.35,0,.42);ctx.closePath();
  }else{
    const points=[[0,-.44]];for(let i=1;i<=10;i++){const t=i/11;points.push([Math.sin(t*Math.PI)*(.29+(i%2)*.03),-.44+t*.79]);}points.push([0,.4]);for(let i=10;i>=1;i--){const t=i/11;points.push([-Math.sin(t*Math.PI)*(.29+(i%2)*.03),-.44+t*.79]);}polygon(ctx,points);
  }
  ctx.fill();ctx.save();ctx.clip();const gloss=ctx.createLinearGradient(-.4,-.35,.4,.35);gloss.addColorStop(0,'#ffedbc50');gloss.addColorStop(.45,'#ffffff05');gloss.addColorStop(1,'#351d1165');ctx.fillStyle=gloss;ctx.fillRect(-.5,-.5,1,1);
  ctx.strokeStyle='#48280e65';ctx.lineWidth=.014;ctx.beginPath();ctx.moveTo(0,.47);ctx.lineTo(0,-.42);
  for(const side of [-1,1])for(const y of [-.15,.06,.23]){ctx.moveTo(0,y+.07);ctx.quadraticCurveTo(side*.12,y,side*.28,y-.12);}ctx.stroke();ctx.restore();
  ctx.strokeStyle='#725028';ctx.lineWidth=.018;ctx.beginPath();ctx.moveTo(0,.32);ctx.quadraticCurveTo(.005,.41,.04,.48);ctx.stroke();
}
function petal(ctx,shape){
  ctx.beginPath();ctx.moveTo(0,.4);
  if(shape==='cherry'){ctx.bezierCurveTo(-.5,.1,-.39,-.42,-.07,-.37);ctx.lineTo(0,-.24);ctx.lineTo(.065,-.39);ctx.bezierCurveTo(.41,-.43,.44,.08,0,.4);}
  else if(shape==='rose'){ctx.bezierCurveTo(-.48,.35,-.45,-.17,-.21,-.3);ctx.bezierCurveTo(.07,-.5,.49,-.35,.37,-.08);ctx.bezierCurveTo(.27,.15,.2,.35,0,.4);}
  else{ctx.bezierCurveTo(-.32,.15,-.29,-.25,.06,-.43);ctx.bezierCurveTo(.38,-.13,.26,.2,0,.4);}
  ctx.closePath();ctx.fill();ctx.save();ctx.clip();const g=ctx.createLinearGradient(-.3,-.3,.3,.4);g.addColorStop(0,'#ffffff60');g.addColorStop(.55,'#ffffff00');g.addColorStop(1,'#642b3c55');ctx.fillStyle=g;ctx.fillRect(-.5,-.5,1,1);ctx.strokeStyle='#ffffff48';ctx.lineWidth=.012;ctx.beginPath();ctx.moveTo(0,.33);ctx.quadraticCurveTo(-.03,.05,0,-.17);ctx.stroke();ctx.restore();
}
function seed(ctx,shape){
  ctx.lineWidth=.009;ctx.lineCap='round';const cy=shape==='tuft'?.1:-.02;
  for(let i=0;i<20;i++){
    const a=Math.PI+(i/19)*Math.PI,x=Math.cos(a)*.39,y=cy+Math.sin(a)*.34;
    ctx.beginPath();ctx.moveTo(0,cy+.08);ctx.quadraticCurveTo(x*.4,cy-.14,x,y);ctx.stroke();
    ctx.lineWidth=.013;ctx.beginPath();ctx.moveTo(x-.04,y-.015);ctx.lineTo(x+.04,y-.025);ctx.stroke();ctx.lineWidth=.009;
  }
  ctx.beginPath();ctx.moveTo(0,cy+.08);ctx.quadraticCurveTo(.025,.2,-.015,.35);ctx.stroke();ctx.fillStyle='#a48b62';ctx.beginPath();ctx.ellipse(-.012,.36,.028,.075,-.12,0,Math.PI*2);ctx.fill();
}
export function createFallSprites(options){
  const sprites=new Map(),shapes=options.shape==='mixed'?FALL_SHAPES[options.kind].slice(1):[options.shape];
  const colors=options.colorMode==='single'?[options.color]:[options.color,options.color2,options.color3];
  for(const shape of shapes)for(let c=0;c<colors.length;c++){
    const image=document.createElement('canvas');image.width=image.height=128;const ctx=image.getContext('2d');
    if(!ctx)throw new Error('Canvas 2D is unavailable.');ctx.translate(64,64);ctx.scale(112,112);ctx.fillStyle=ctx.strokeStyle=colors[c];
    if(options.softness>0)ctx.filter=`blur(${options.softness*2.5}px)`;
    if(options.kind==='snow')snow(ctx,shape,c);else if(options.kind==='leaves')leaf(ctx,shape);else if(options.kind==='petals')petal(ctx,shape);else seed(ctx,shape);
    sprites.set(`${shape}/${c}`,image);
  }
  return{get(shape,index){return sprites.get(`${shape}/${options.colorMode==='single'?0:index}`);},get size(){return sprites.size;},destroy(){for(const image of sprites.values())image.width=image.height=1;sprites.clear();}};
}
