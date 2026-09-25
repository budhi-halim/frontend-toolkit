import {mulberry32,clamp} from './utils.js';

// === ASYMMETRIC LEADERS WITH FORWARD-BIASED FORKS ===
// A bounded visual model, not an electrical-breakdown simulation.
export function lightningGeometry({seed=7,start,end,width=600,height=300,branches=5,roughness=.65,branchSpread=32,branchLength=.34,tortuosity=.42,taper=.58}={}) {
  if(!start||!end||![start.x,start.y,end.x,end.y].every(Number.isFinite))throw new TypeError('Finite lightning endpoints are required.');
  const random=mulberry32(seed),paths=[],dx=end.x-start.x,dy=end.y-start.y,length=Math.hypot(dx,dy);
  if(length<.01)return [{path:[start,end],weight:1,depth:0}];
  const forward={x:dx/length,y:dy/length},normal={x:-forward.y,y:forward.x};
  const mainLevels=clamp(Math.ceil(Math.log2(Math.max(64,length/2))),6,8),bend=clamp(tortuosity,0,1),rough=clamp(roughness,0,1.4);
  function subdivide(a,b,levels,strength) {
    const out=[a];
    function split(p,q,n,amplitude){
      if(!n){out.push(q);return;}
      const x=q.x-p.x,y=q.y-p.y,l=Math.max(.001,Math.hypot(x,y)),fraction=.34+random()*.32;
      const offset=(random()-.5)*2*amplitude;
      const m={x:p.x+x*fraction-y/l*offset,y:p.y+y*fraction+x/l*offset};
      split(p,m,n-1,amplitude*(.40+random()*.16));split(m,q,n-1,amplitude*(.40+random()*.16));
    }
    split(a,b,levels,strength);return out;
  }
  // A few unequal turning regions set the large-scale leader shape. The fine
  // subdivision adds secondary detail without changing the branching direction.
  const anchors=[start],count=4,phase=random()*Math.PI*2,skew=(random()-.5)*.4;
  for(let i=1;i<count;i++){
    const p=i/count+(random()-.5)*.12;
    const offset=(Math.sin(p*Math.PI*1.7+phase)*.65+(random()-.5)*.7+skew)*Math.sin(Math.PI*p)*length*.21*bend;
    anchors.push({x:start.x+dx*p+normal.x*offset,y:start.y+dy*p+normal.y*offset});
  }
  anchors.push(end);
  const main=[start];
  for(let i=0;i<count;i++){
    const a=anchors[i],b=anchors[i+1],l=Math.hypot(b.x-a.x,b.y-a.y);
    main.push(...subdivide(a,b,mainLevels-2,l*.13*rough).slice(1));
  }
  paths.push({path:main,weight:1,depth:0});
  const n=clamp(Math.round(branches),0,12),slots=Array.from({length:n},(_,i)=>i);
  for(let i=n-1;i>0;i--){const j=Math.floor(random()*(i+1));[slots[i],slots[j]]=[slots[j],slots[i]];}
  let side=random()<.5?-1:1,twigs=0;
  function bounded(p){return{x:clamp(p.x,-width*.18,width*1.18),y:clamp(p.y,-height*.18,height*1.18)};}
  for(const slot of slots){
    const fraction=.09+(slot+.2+random()*.6)/Math.max(n,1)*.76;
    const index=clamp(Math.round(fraction*(main.length-1)),2,main.length-5),a=main[index];
    const before=main[Math.max(0,index-7)],after=main[Math.min(main.length-1,index+9)];
    let tx=after.x-before.x,ty=after.y-before.y,l=Math.max(.001,Math.hypot(tx,ty));
    tx=tx/l*.22+forward.x*.78;ty=ty/l*.22+forward.y*.78;
    // Clusters of unequal forks, never paired opposing branches from one node.
    if(random()<.35)side=-side;
    const divergence=clamp(branchSpread,8,65)*Math.PI/180*(.45+random()*.8);
    const angle=Math.atan2(ty,tx)+side*divergence;
    const span=length*clamp(branchLength,.06,.8)*(.35+random()*.8)*(1-fraction*.5);
    const b=bounded({x:a.x+Math.cos(angle)*span,y:a.y+Math.sin(angle)*span});
    const branch=subdivide(a,b,Math.max(4,mainLevels-2),span*(.09*rough+.045*bend));
    const weight=clamp(taper,.15,.9)*(.62+random()*.35)*(1-fraction*.22);
    paths.push({path:branch,weight,depth:1});
    if(random()<.55&&span>length*.10&&twigs<21-n){
      twigs++;
      const j=clamp(Math.floor(branch.length*(.36+random()*.37)),1,branch.length-2),p=branch[j];
      const phi=angle+(random()<.7?side:-side)*divergence*(.3+random()*.5);
      const size=span*(.2+random()*.32);
      const to=bounded({x:p.x+Math.cos(phi)*size,y:p.y+Math.sin(phi)*size});
      paths.push({path:subdivide(p,to,4,size*.13*rough),weight:weight*(.35+random()*.2),depth:2});
    }
  }
  return paths;
}
