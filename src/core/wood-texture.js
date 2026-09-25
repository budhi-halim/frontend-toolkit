// === ANATOMY-INSPIRED WOOD FIELD; PURE AND SERIALIZABLE FOR THE TEXTURE WORKER ===
// Parameters describe visual families, not measured botanical specimens.
export function createWoodField(o,cssWidth,cssHeight,noise,hash){
  const profiles={
    oak:{spacing:15,late:.28,band:.22,pores:.85,ringPores:1,rays:.85,curl:.12,streak:.1},
    ash:{spacing:23,late:.22,band:.27,pores:.72,ringPores:1,rays:.13,curl:.06,streak:.02},
    walnut:{spacing:18,late:.32,band:.16,pores:.42,ringPores:.45,rays:.1,curl:.38,streak:.48},
    maple:{spacing:13,late:.15,band:.065,pores:.06,ringPores:0,rays:.12,curl:.48,streak:.06},
    pine:{spacing:22,late:.18,band:.43,pores:0,ringPores:0,rays:0,curl:.13,streak:.05,soft:true},
    cedar:{spacing:10,late:.21,band:.31,pores:0,ringPores:0,rays:0,curl:.06,streak:.55,soft:true},
    cherry:{spacing:16,late:.24,band:.105,pores:.1,ringPores:.18,rays:.06,curl:.24,streak:.2},
    mahogany:{spacing:21,late:.2,band:.045,pores:.37,ringPores:0,rays:.07,curl:.05,streak:.17,interlock:true},
    teak:{spacing:17,late:.27,band:.14,pores:.65,ringPores:.48,rays:.08,curl:.08,streak:.4},
    rosewood:{spacing:12,late:.4,band:.12,pores:.36,ringPores:0,rays:.06,curl:.23,streak:1},
    ebony:{spacing:9,late:.2,band:.03,pores:.03,ringPores:0,rays:.02,curl:.05,streak:.6},
    bamboo:{spacing:8,late:.2,band:.05,pores:0,ringPores:0,rays:0,curl:0,streak:.1}
  };
  const species=o.woodSpecies||'oak',p=profiles[species]||profiles.oak,cut=o.woodCut||'plain-sawn',finish=o.woodFinish||'natural';
  const vertical=o.orientation==='vertical'||o.orientation==='auto'&&cssHeight>cssWidth;
  const alongSize=vertical?cssHeight:cssWidth,crossSize=vertical?cssWidth:cssHeight;
  const longScale=Math.pow(Math.max(.0001,o.grainX)/.002,.28),crossScale=Math.pow(Math.max(.0001,o.grainY)/.035,.32);
  const spacing=p.spacing/(Math.max(.4,crossScale)*(o.ringScale||1)),warp=o.depth/50;
  const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)),fract=v=>v-Math.floor(v);
  const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
  const knotAmount=o.knots??(p.soft?.6:.15),poreAmount=o.pores??1;
  const speciesSeed=[...species].reduce((n,c)=>n+c.charCodeAt(0),0);
  const center=crossSize*(.32+hash(66,speciesSeed)*.45);
  const knotL=alongSize*(.23+hash(4,7)*.5),knotA=crossSize*(.2+hash(8,4)*.6),knotRadius=(p.soft?22:12)*knotAmount;
  const phase=hash(22,speciesSeed)*40,result={tone:0,relief:0};
  function vessel(l,a,growth){
    if(!p.pores||!poreAmount)return 0;
    // Longitudinal pores are short, thin, interrupted streaks, not endless black lines.
    const end=cut==='end-grain',xx=l/(end?2.4:11),yy=a/(end?2.4:2.8),ix=Math.floor(xx),iy=Math.floor(yy);
    const cx=.25+hash(ix,iy)*.5,cy=.25+hash(ix+93,iy+71)*.5;
    const dx=(fract(xx)-cx)/(end?.3:.39),dy=(fract(yy)-cy)/(end?.3:.17);
    const ellipse=1-smooth(.32,1,dx*dx+dy*dy),occurs=hash(ix+3,iy+5)>.36?1:0;
    const early=1-smooth(.08,.46,fract(growth+.11));
    return ellipse*occurs*p.pores*poreAmount*((1-p.ringPores)*.65+p.ringPores*early);
  }
  return function woodAt(X,Y){
    let L=(vertical?Y:X)*longScale,A=vertical?X:Y;
    const n=noise(L*.003+11,A*.01),fine=(cut==='end-grain'?noise(L*.7,A*.7):noise(L*.035,A*1.2+(noise(L*.009,A*.06)-.5)*6))-.5;
    const threads=(cut==='end-grain'?noise(L*2.1,A*2.1):noise(L*.021,A*3.5+(noise(L*.005,A*.1)-.5)*11))-.5;
    if(species==='bamboo'){
      const stripWidth=34,strip=Math.floor(A/stripWidth),local=A-strip*stripWidth;
      const seam=Math.exp(-Math.min(local,stripWidth-local)*1.9);
      const nodeL=L+hash(strip,81)*225,node=Math.abs(fract(nodeL/260)-.5)*260;
      const nodeBand=Math.exp(-node*node/7),bundles=noise(L*.018+strip*19,A*1.8);
      const vascular=Math.pow(bundles,4)*.34,shimmer=noise(L*.004,A*.13)*.09;
      if(cut==='end-grain'){
        const xx=L/7,yy=A/7,ix=Math.floor(xx),iy=Math.floor(yy),dx=fract(xx)-.2-hash(ix,iy)*.6,dy=fract(yy)-.2-hash(ix+33,iy)*.6;
        const dot=Math.exp(-(dx*dx+dy*dy)*47);result.tone=.6-dot*.35+(n-.5)*.1;result.relief=.5-dot*.12;
      }else{result.tone=.66-seam*.2-nodeBand*.23-vascular+shimmer+(hash(strip,5)-.5)*.08;result.relief=.5-seam*.08-nodeBand*.1-vascular*.18+fine*.04;}
      return result;
    }
    const waviness=(noise(L*.004,A*.006)-.5)*14*warp+(noise(L*.011,A*.018)-.5)*3*warp;
    A+=waviness;
    const dl=(L-knotL)*.54,da=A-knotA,knotDistance=Math.sqrt(dl*dl+da*da),knotFade=knotRadius>0?Math.exp(-knotDistance*knotDistance/(knotRadius*knotRadius*5)):0;
    A+=da*knotFade*1.4;
    let radial;
    if(cut==='end-grain'){
      const dx=L-alongSize*(.35+hash(61,1)*.3),dy=A-crossSize*(.3+hash(72,9)*.4);radial=Math.hypot(dx,dy);
      radial+=(noise(dx*.015,dy*.015)-.5)*spacing*1.2+(noise(dx*.048,dy*.048)-.5)*spacing*.24;
    }else if(cut==='quarter-sawn')radial=A+(noise(L*.002,A*.009)-.5)*spacing*.6;
    else{
      // A tangential plane through nested, tapering growth shells makes cathedral arches.
      const taper=.11+p.curl*.08,z=18+(L+alongSize*.15)*taper+Math.sin(L*.004+phase)*7*warp;
      radial=Math.sqrt((A-center)*(A-center)+z*z);
    }
    let growth=radial/spacing+phase+(noise(radial*.022,L*.006)-.5)*1.6+(noise(radial*.11,L*.013)-.5)*.23;
    const ring=Math.floor(growth),f=fract(growth),lateWidth=p.late*(.78+hash(ring,51)*.44);
    const late=smooth(1-lateWidth-.15,1-lateWidth+.08,f)*(1-smooth(.94,1,f));
    const boundary=Math.exp(-(((f-.97)*37)**2));
    const pores=vessel(L,A,growth),diffuse=(noise(L*.003,A*.008)-.5)*.12;
    let tone=.6-late*p.band*(.65+noise(L*.011,A*.12)*.5)-boundary*p.band*.1+diffuse+fine*o.fibers*.14+threads*o.fibers*.16-pores*.2;
    let height=.5-late*(p.soft?.055:.018)-pores*.12+fine*o.fibers*.055+threads*o.fibers*.025;
    // Interlocked grain has broad alternating ribbon figure rather than ring bands.
    if(p.interlock){const ribbon=Math.sin(A/13+(noise(L*.003,A*.003)-.5)*2);tone+=ribbon*.09*Math.cos(o.lightAngle*Math.PI/180+.7);height+=ribbon*.015;}
    else if(cut!=='end-grain')tone+=(noise(L*.006,A*.07)-.5)*p.curl*.18;
    const streak=Math.pow(noise(L*.008,A*.17+(noise(L*.002,A*.008)-.5)*3),3);
    if(cut!=='end-grain')tone-=streak*p.streak*(species==='rosewood'?.62:.25);
    if(p.rays&&cut!=='end-grain'){
      const rx=A/(cut==='quarter-sawn'?47:8)+noise(L*.014,A*.015)*.6,ry=L/(cut==='quarter-sawn'?18:13),ix=Math.floor(rx),iy=Math.floor(ry);
      const dx=(fract(rx)-.25-hash(ix,iy)*.5)/(cut==='quarter-sawn'?.42:.21),dy=(fract(ry)-.2-hash(ix+7,iy+9)*.6)/(cut==='quarter-sawn'?.11:.18);
      const fleck=(1-smooth(.25,1,dx*dx+dy*dy))*(hash(ix+141,iy+47)>.82?1:0);
      tone+=fleck*p.rays*(cut==='quarter-sawn'?.22:.03);height+=fleck*p.rays*.018;
    }
    if(knotRadius>0&&cut!=='end-grain'){
      const core=1-smooth(knotRadius*.45,knotRadius*1.05,knotDistance),knotRings=.5+.5*Math.sin(knotDistance*1.05+noise(L*.1,A*.1));
      tone=tone*(1-core*.7)-core*.12-knotFade*knotRings*.09;
      height-=core*.055+knotFade*knotRings*.014;
    }
    if(finish==='weathered'){
      const cracks=Math.pow(noise(L*.02,A*.7),12)*(noise(L*.009,A*.11)>.3?1:0);
      tone-=cracks*.5*o.weathering;height-=cracks*.28+late*.055; tone+=(noise(L*.01,A*.07)-.5)*o.weathering*.2;
    }else if(finish==='charred'){
      const split=Math.pow(.5+.5*Math.sin(A*.31+noise(L*.01,A*.04)*3),26),cross=Math.pow(.5+.5*Math.sin(L*.055+noise(L*.08,A*.02)*4),30);
      const crack=Math.max(split,cross*.7);tone=.42+tone*.25-crack*.37;height=.5-crack*.3+late*.04;
    }else if(finish==='smooth')height=.5+(height-.5)*.28;
    result.tone=clamp(tone);result.relief=height;return result;
  };
}
