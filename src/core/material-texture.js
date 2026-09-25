import {createWoodField} from './wood-texture.js';
// === CPU MATERIAL KERNEL; SHARED VERBATIM WITH ITS WORKER ===
export function materialPixels(job){
  const {width:w,height:h,cssWidth,cssHeight,options:o,rgb}=job,seed=o.seed|0;
  const pixels=new Uint8ClampedArray(w*h*4),relief=new Float32Array(w*h),tone=new Float32Array(w*h);
  const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
  function hash(x,y){let n=Math.imul(x^seed,374761393)+Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967295;}
  function noise(x,y){const ix=Math.floor(x),iy=Math.floor(y);let fx=x-ix,fy=y-iy;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);const a=hash(ix,iy),b=hash(ix+1,iy),c=hash(ix,iy+1),d=hash(ix+1,iy+1);return a+(b-a)*fx+(c-a)*fy+(a-b-c+d)*fx*fy;}
  function fbm(x,y,n=3){n=Math.max(1,Math.min(6,Math.round(n*detail/3)));let result=0,amp=.55;for(let i=0;i<n;i++){result+=noise(x,y)*amp;const xx=x;x=xx*1.93-y*.21+7.7;y=y*2.04+xx*.17+15.1;amp*=.48;}return result;}
  const vertical=o.orientation==='vertical'||o.orientation==='auto'&&cssHeight>cssWidth;
  const longGrain=Math.pow(Math.max(.0001,o.grainX)/.002,.35);
  const grain=Math.pow(Math.max(.0001,o.grainY)/.035,.35),warp=o.depth/50,detail=Math.min(5,Math.max(2,Math.round(o.detail/3)));
  const wood=o.material==='wood'?createWoodField(o,cssWidth,cssHeight,noise,hash):null;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const X=x/w*cssWidth,Y=y/h*cssHeight,u=X/110*(o.material==='wood'?1:longGrain),v=Y/110*(o.material==='wood'?1:grain),random=hash(x,y),i=y*w+x;
    let a=.5,t=.5;
    if(wood){
      const sample=wood(X,Y);t=sample.tone;a=sample.relief;
    }else if(o.material==='paper'){
      const kind=o.paperKind||'cotton',pulp=fbm(u*18,v*18,detail),fiber=(noise(u*140,v*8)+noise(u*11,v*120))*.5;
      const edge=Math.pow(Math.max(Math.abs(x/w-.5),Math.abs(y/h-.5))*2,5),stain=fbm(u*.9,v*.9,3)*.5+edge*.2;
      a=.42+pulp*.13+(fiber-.5)*.16*o.fibers+(random-.5)*.1;
      t=.53+(pulp-.45)*.1+(random-.5)*.035-stain*o.weathering*.35;
      if(kind==='watercolor'){
        const tooth=noise(u*8,v*8),pit=Math.pow(noise(u*25+tooth*2,v*25),3);
        a=.38+tooth*.2-pit*.16+(random-.5)*.05;t=.52+(tooth-.5)*.06-pit*.025;
      }else if(kind==='kraft'){
        const coarse=noise(u*65,v*4),chips=Math.pow(noise(u*18,v*25),8);
        a+=coarse*.09-chips*.12;t+=(coarse-.5)*.055-chips*.33*o.fibers;
      }else if(kind==='parchment'){
        const membrane=fbm(u*1.3,v*1.3,4),creases=Math.exp(-Math.abs(Math.sin(u*3+v*4+membrane*7))*40);
        t=.59+(membrane-.5)*.3-stain*o.weathering*.42-creases*.055;a=.45+membrane*.07+creases*.025;
      }else if(kind==='laid'){
        const ribs=.5+.5*Math.cos(Y*Math.PI*.66),chain=Math.pow(.5+.5*Math.sin(X*.14),18);
        a+=ribs*.035-chain*.035;t+=ribs*.035-chain*.035;
      }else if(kind==='washi'){
        const longFiber=noise(u*8,v*180)+noise(u*160,v*12)-1;a+=longFiber*.16;t+=longFiber*.035;
      }
    }else if(o.material==='marble'){
      const kind=o.marbleKind||'carrara',warp1=fbm(u*.8,v*.8,4),warp2=fbm(u*1.2+5,v*1.2+3,3);
      const bold=kind==='calacatta'||kind==='statuario',dark=(rgb[0]+rgb[1]+rgb[2])/3<.4;
      const path=(kind==='statuario'?u*.6+v*2.2:u*2.5+v*1.6)+warp1*(4+warp*3)+warp2*1.3;
      const primary=Math.abs(Math.sin(path*(bold?.65:kind==='nero'?1.4:2)));
      const vein=Math.exp(-primary*(kind==='calacatta'?12:kind==='statuario'?21:kind==='nero'?55:35))*(.3+.7*fbm(u*3,v*3,3));
      const branch=Math.exp(-Math.abs(Math.sin(path*(kind==='nero'?4.7:3.9)+warp2*(bold?4:2)))*90)*(kind==='nero'?.6:bold?.2:.4);
      const mist=kind==='calacatta'?Math.exp(-primary*4)*.18:kind==='carrara'?warp2*.045:0;
      t=.56+(warp1-.4)*.16+(vein+branch+mist)*(dark?.86:-.6);
      a=.5+(vein+branch)*.04+(random-.5)*.018;
    }else if(o.material==='linen'){
      const xx=X*.36*longGrain,yy=Y*.36*grain,ix=Math.floor(xx),iy=Math.floor(yy),fx=xx-ix,fy=yy-iy;
      const horizontal=(ix+iy)%2===0;
      const strand=Math.sin((horizontal?fy:fx)*Math.PI);
      const seam=clamp(Math.min(fx,1-fx,fy,1-fy)*12);
      a=.28+strand*.38*seam+(random-.5)*.08;
      t=.47+strand*.12*seam+(hash(ix,iy)-.5)*.1;
    }else if(o.material==='cork'){
      const xx=u*20,yy=v*19,ix=Math.floor(xx),iy=Math.floor(yy);let d1=100,d2=100,cell=.5;
      for(let ay=-1;ay<=1;ay++)for(let ax=-1;ax<=1;ax++){const cx=ix+ax,cy=iy+ay,dx=cx+hash(cx,cy)-xx,dy=cy+hash(cx+51,cy+32)-yy,ds=dx*dx+dy*dy;if(ds<d1){d2=d1;d1=ds;cell=hash(cx+1,cy+1);}else if(ds<d2)d2=ds;}
      const edge=clamp((d2-d1)*8);t=.3+cell*.38+noise(u*75,v*75)*.16-(1-edge)*.08;a=.3+cell*.26+edge*.13+(random-.5)*.07;
    }else if(o.material==='sand'){
      const flow=u*3+v*15+fbm(u*.9,v*.5,3)*3;
      const ridge=Math.sin(flow)*.5+.5;a=.25+ridge*.38+(random-.5)*.13;t=.44+ridge*.13+(random-.5)*.2;
    }else if(o.material==='slate'){
      const shift=fbm(u*.6,v*.9,3);const lamina=noise(u*.8+shift,v*14+shift*7);
      const crack=Math.pow(.5+.5*Math.sin(v*40+shift*14),18);
      a=.4+lamina*.17-crack*.06+(random-.5)*.05;t=.48+(lamina-.5)*.38-crack*.17;
    }else if(o.material==='granite'){
      const mineral=noise(u*47,v*47),micro=noise(u*133,v*133),large=fbm(u*5,v*5,3);
      t=clamp(.2+mineral*.68+(large-.5)*.3+(micro-.5)*.28);a=.42+micro*.08+(mineral-.5)*.04;
    }else{
      const wash=fbm(u*.9,v*.9,4),pore=fbm(u*28,v*28,3);
      a=.42+pore*.13+(random-.5)*.1;t=.52+(wash-.5)*(.14+o.weathering*.45)+(pore-.5)*.07;
    }
    relief[i]=a;tone[i]=t;
  }
  const angle=o.lightAngle*Math.PI/180,elevation=o.elevation*Math.PI/180,lx=Math.cos(angle)*Math.cos(elevation),ly=Math.sin(angle)*Math.cos(elevation),lz=Math.sin(elevation);
  const strength=o.roughness*.62,contrast=o.contrast;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=y*w+x,dx=(relief[y*w+Math.min(w-1,x+1)]-relief[y*w+Math.max(0,x-1)])*strength,dy=(relief[Math.min(h-1,y+1)*w+x]-relief[Math.max(0,y-1)*w+x])*strength;
    const illumination=(-dx*lx-dy*ly+lz)/Math.sqrt(1+dx*dx+dy*dy);
    const shade=1+(tone[i]-.5)*contrast*.9+(illumination-lz)*contrast*.65;
    for(let c=0;c<3;c++)pixels[i*4+c]=clamp(rgb[c]*shade)*255;
    pixels[i*4+3]=255;
  }
  return{width:w,height:h,data:pixels.buffer};
}
