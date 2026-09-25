// === ARC-LENGTH GEOMETRY IN CSS PIXELS ===
export function roundedPerimeter(width,height,radius=0){
  const w=Math.max(0,width),h=Math.max(0,height),r=Math.min(Math.max(0,radius),w/2,h/2);
  const horizontal=w-2*r,vertical=h-2*r,arc=Math.PI*r/2;
  const lengths=[horizontal,arc,vertical,arc,horizontal,arc,vertical,arc];
  const total=lengths.reduce((a,b)=>a+b,0);
  function pointAt(distance){
    let s=((distance%total)+total)%total;if(!total)return{x:0,y:0,nx:0,ny:-1};
    let i=0;while(i<7&&s>lengths[i]){s-=lengths[i];i++;}
    if(i===0)return{x:r+s,y:0,nx:0,ny:-1};
    if(i===2)return{x:w,y:r+s,nx:1,ny:0};
    if(i===4)return{x:w-r-s,y:h,nx:0,ny:1};
    if(i===6)return{x:0,y:h-r-s,nx:-1,ny:0};
    const theta=[0,-Math.PI/2,0,0,0,Math.PI/2,0,Math.PI][i]+s/Math.max(r,.000001);
    const cx=(i===1||i===3)?w-r:r,cy=(i===1||i===7)?r:h-r;
    return{x:cx+r*Math.cos(theta),y:cy+r*Math.sin(theta),nx:Math.cos(theta),ny:Math.sin(theta)};
  }
  return{length:total,width:w,height:h,radius:r,pointAt};
}
export function ellipticalPerimeter(width,height){
  const rx=Math.max(.001,width/2),ry=Math.max(.001,height/2),count=2048;
  const distances=new Float64Array(count+1);let lastX=rx,lastY=0;
  for(let i=1;i<=count;i++){const a=i/count*Math.PI*2-Math.PI/2,x=rx+rx*Math.cos(a),y=ry+ry*Math.sin(a);distances[i]=distances[i-1]+Math.hypot(x-lastX,y-lastY);lastX=x;lastY=y;}
  const length=distances[count];
  return{length,width,height,pointAt(distance){
    const d=((distance%length)+length)%length;let lo=0,hi=count;
    while(hi-lo>1){const mid=(hi+lo)>>1;if(distances[mid]<d)lo=mid;else hi=mid;}
    const f=(d-distances[lo])/Math.max(1e-9,distances[hi]-distances[lo]);
    const a=(lo+f)/count*Math.PI*2-Math.PI/2;
    const nx=Math.cos(a)/rx,ny=Math.sin(a)/ry,n=Math.hypot(nx,ny);
    return{x:rx+rx*Math.cos(a),y:ry+ry*Math.sin(a),nx:nx/n,ny:ny/n};
  }};
}
export function borderRadiusPixels(element,width,height){
  const value=getComputedStyle(element).borderTopLeftRadius.split(' ')[0];
  return Math.min(Math.min(width,height)/2,value.endsWith('%')?parseFloat(value)/100*Math.min(width,height):parseFloat(value)||0);
}

// === PATH CONSTRUCTION WITHOUT THE NEWER roundRect API ===
export function roundedPath(path,x,y,width,height,radius){
  const r=Math.min(Math.max(0,radius),width/2,height/2);
  path.moveTo(x+r,y);path.lineTo(x+width-r,y);path.arcTo(x+width,y,x+width,y+r,r);
  path.lineTo(x+width,y+height-r);path.arcTo(x+width,y+height,x+width-r,y+height,r);
  path.lineTo(x+r,y+height);path.arcTo(x,y+height,x,y+height-r,r);
  path.lineTo(x,y+r);path.arcTo(x,y,x+r,y,r);path.closePath();return path;
}
