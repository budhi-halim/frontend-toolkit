// === STATUS LAYOUT IN CSS PIXELS ===
// Every profile line belongs to the text column, including the last short line.
export function skeletonShapes(width,height,o){
  const w=Math.max(1,width*o.width),cx=width*o.anchorX,cy=height*o.anchorY;
  const lineHeight=o.lineHeight,gap=o.gap,lines=o.lines,avatar=o.skeletonLayout==='avatar',card=o.skeletonLayout==='card';
  const textHeight=lines*lineHeight+Math.max(0,lines-1)*gap;
  // Keep a usable text column even on a very narrow host.
  const avatarSize=avatar?Math.min(o.avatarSize,w*.4):0;
  const avatarGap=avatar?Math.min(o.avatarGap,Math.max(0,w-avatarSize-2)):0;
  const inset=avatarSize+avatarGap,media=card?70:0,total=card?media+gap+textHeight:Math.max(avatarSize,textHeight);
  const x=cx-w/2,y=cy-total/2,shapes=[];
  if(card)shapes.push({x,y,w,h:media,r:o.radius});
  if(avatar)shapes.push({x,y:cy-avatarSize/2,w:avatarSize,h:avatarSize,r:avatarSize/2});
  const textTop=card?y+media+gap:cy-textHeight/2;
  for(let i=0;i<lines;i++)shapes.push({x:x+inset,y:textTop+i*(lineHeight+gap),w:Math.max(.5,(w-inset)*(i===lines-1?.57:i===0?.82:.94)),h:lineHeight,r:Math.min(o.radius,lineHeight/2)});
  return shapes;
}

export function ringGeometry(width,height,o){
  const x=width*o.anchorX,y=height*o.anchorY;
  const outer=Math.max(0,Math.min(o.size/2,x,width-x,y,height-y));
  const thickness=Math.min(o.thickness,outer);
  return {radius:Math.max(0,outer-thickness/2),thickness};
}
