/*! Frontend Toolkit 1.0.0. Copyright (c) 2026 Frontend Toolkit contributors.
MIT for project code. Retained upstream material is not relicensed.
Keep the distribution LICENSE, NOTICE.txt and licenses/ files with these modules. */
import{NOISE_GLSL as e}from"./noise.js";const t=`
precision highp float;
varying vec2 vUv;
uniform vec2 uResolution,uHostSize,uViewSize;
uniform float uPadding,uRadius,uTime,uSeed,uScale,uHeight,uIntensity,uTurbulence,uWind,uSpread,uEmbers;
uniform float uModel,uOutside,uDirection,uEdge,uReach,uGravity,uFilament,uBlue,uDetail,uBorder;
uniform vec3 uColor,uColor2,uColor3;
uniform float uFlameSpeed,uFlickerSpeed,uSourceOffset;
float flowTime(){return uTime*uFlameSpeed;}
float flickerTime(){return uTime*uFlickerSpeed;}
${e}
vec2 borderPosition;
float roundedBox(vec2 p,vec2 halfSize,float r){vec2 q=abs(p)-halfSize+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
vec2 emitter(vec2 point,out float breadth){
  vec2 size=uHostSize;float lengthScale=uOutside>.5?uReach:size.y;
  if(uOutside>.5&&uDirection>3.5){
    // Solve the distance of an expanding, upward-accelerated source contour.
    vec2 original=point;float reach=max(uReach,1.),age=max(roundedBox(point-size*.5,size*.5,uRadius),0.)/reach;
    for(int k=0;k<5;k++){point=original-vec2(0.,uGravity*age*age*reach*.42);float next=max(roundedBox(point-size*.5,size*.5,uRadius),0.)/reach;age=mix(age,next,.55);}
    point=original-vec2(0.,uGravity*age*age*reach*.42);
    vec2 c=point-size*.5;float dist=max(roundedBox(c,size*.5,uRadius),0.);
    vec2 q=abs(c)-size*.5+uRadius;vec2 n=normalize(max(q,0.)+.0001)*sign(c);
    if(max(q.x,q.y)<0.)n=abs(c.x)/(size.x*.5)>abs(c.y)/(size.y*.5)?vec2(sign(c.x),0.):vec2(0.,sign(c.y));
    borderPosition=point-n*dist;
    float lane=abs(n.y)>.6?borderPosition.x:borderPosition.y+size.x;
    breadth=1.8;return vec2(mod(lane/reach+.9,1.8)-.9,age);
  }
  vec2 dir=vec2(0.,1.);if(uDirection>.5&&uDirection<1.5)dir=vec2(1.,0.);else if(uDirection>1.5&&uDirection<2.5)dir=vec2(0.,-1.);else if(uDirection>2.5&&uDirection<3.5)dir=vec2(-1.,0.);
  float edge=uEdge;
  if(edge<.5||edge>4.5)edge=uDirection<.5?1.:uDirection<1.5?2.:uDirection<2.5?3.:4.;
  vec2 origin;
  if(uOutside>.5)origin=edge<1.5?vec2(size.x*.5,size.y):edge<2.5?vec2(size.x,size.y*.5):edge<3.5?vec2(size.x*.5,0.):vec2(0.,size.y*.5);
  else origin=uDirection<.5?vec2(size.x*.5,0.):uDirection<1.5?vec2(0.,size.y*.5):uDirection<2.5?vec2(size.x*.5,size.y):vec2(size.x,size.y*.5);
  if(abs(dir.x)>.5&&uOutside<.5)lengthScale=size.x;
  float projected=dot(point-origin,dir)/max(lengthScale,1.),distance=max(projected,0.);
  if(uOutside>.5&&abs(dir.y)>.5&&uGravity>.001){
    float g=uGravity*.6;
    if(dir.y>0.)distance=(sqrt(max(0.,1.+4.*g*distance))-1.)/(2.*g);
    else{float discriminant=1.-4.*g*projected;if(discriminant<0.)return vec2(0.,-2.);distance=(1.-sqrt(max(0.,discriminant)))/(2.*g);}
    point.y-=uGravity*distance*distance*lengthScale*.6;
  }
  point.y-=uGravity*distance*distance*lengthScale*.6*abs(dir.x);
  vec2 tangent=vec2(dir.y,-dir.x);breadth=(abs(dir.x)>.5?size.y:size.x)/max(lengthScale,1.);
  return vec2(dot(point-origin,tangent)/max(lengthScale,1.)-(uSourceOffset-.5)*breadth,dot(point-origin,dir)/max(lengthScale,1.));
}
vec4 candle(vec2 p,float breadth){
  float h=max(.1,uHeight),y=p.y/h;
  float sway=(sin(flickerTime()*1.9)+.3*sin(flickerTime()*4.1))*.025*uTurbulence;
  float center=uWind*y*y*.22+sway*y*y;
  float width=max(.014,breadth*uSpread*.3)*pow(max(sin(3.14159265*clamp(y,0.,1.)),0.),.74)*(1.-.5*y);
  width*=1.+.05*sin(y*13.-flowTime()*3.);
  float q=(p.x-center)/max(width,.001);float inside=1.-smoothstep(.75,1.04,abs(q));
  float shell=exp(-pow(abs(q)-.65,2.)*13.);
  float fuel=(1.-smoothstep(.035,.22,y))*(1.-smoothstep(.05,.48,abs(q)));
  float heat=clamp(.2+shell*.72+(1.-y)*.3-fuel*.9,0.,1.);
  vec3 col=mix(uColor,uColor2,smoothstep(.02,.45,heat));col=mix(col,uColor3,smoothstep(.45,1.,heat)*.84);
  float blue=exp(-pow((y-.045)*23.,2.))*uBlue;
  col=mix(col,vec3(.08,.23,1.1),blue);float alpha=inside*(1.-fuel*.84)*smoothstep(0.,.018,y)*(1.-smoothstep(.94,1.,y));
  alpha+=exp(-abs(q)*2.5)*.05*(1.-smoothstep(.5,1.,y));
  return vec4(col,clamp(alpha*uIntensity,0.,1.));
}
vec4 ribbons(vec2 p,float breadth){
  float width=breadth*uSpread;vec3 emitted=vec3(0.);float total=0.;
  float layers=floor(mix(5.,9.,uDetail)+.5);
  for(int j=0;j<9;j++){
    if(float(j)>=layers)break;float i=float(j),seed=hash21(vec2(i+uSeed,19.27));
    float offset=(i/max(layers-1.,1.)-.5)*width*.83;
    float life=.55+.43*noise2(vec2(i*2.71+uSeed*.031,flickerTime()*.55));
    float top=uHeight*(life+.17);float y=p.y/max(top,.01);if(y<0.||y>1.08)continue;
    float adv=p.y*(2.8+uScale*.24)-flowTime()*1.65;
    float bend=sin(adv*2.+i*1.93)*(.017+.085*p.y*p.y)*uTurbulence;
    bend+=(noise2(vec2(adv*.85,i*2.3+uSeed*.13))-.5)*uTurbulence*.22*p.y;
    float center=offset*(1.-.65*y)+uWind*p.y*p.y*.3+bend;
    float w=max(.026,width*.17)*(pow(max(1.-y,0.),.76))*(.67+.33*sin(y*8.-flowTime()*2.+i));
    w*=.65+.35*smoothstep(0.,.1,y);
    float q=(p.x-center)/max(w,.001);
    float fold=sin(y*10.-flowTime()*2.4+seed*12.)*.18*uFilament;
    float wave=noise2(vec2(q*2.5+i*8.1,adv*2.+seed*5.))-.5;
    q+=wave*uTurbulence*.6*y;
    float body=(1.-smoothstep(.55,1.1,abs(q)))*(1.-smoothstep(.92,1.06,y));
    // Light is integrated through broad folded sheets, not painted on their silhouettes.
    float optical=exp(-pow(abs(q-fold*.7),2.4)*1.4);
    float breakup=.62+.38*noise2(vec2(q*1.7+seed*8.,adv*1.25));
    float highlight=exp(-pow(q-fold-.18,2.)*3.2)*(.35+.65*noise2(vec2(adv,i*2.9)));
    float thin=highlight*uFilament*.08;
    float heat=clamp(.13+pow(max(1.-y,0.),.72)*.38+highlight*.24,0.,1.);
    vec3 col=mix(uColor,uColor2,smoothstep(.08,.70,heat));
    col=mix(col,uColor3,pow(heat,6.)*.40);
    float blue=exp(-pow((p.y-.018)*43.,2.))*uBlue*.8;col=mix(col,vec3(.09,.22,1.),blue);
    float alpha=body*(.20+optical*.46+thin)*breakup*uIntensity;
    alpha*=smoothstep(-.012,.022,p.y);
    emitted+=col*alpha*(1.-total*.58);total+=alpha*(1.-total);
  }
  return vec4(emitted/max(total,.001),clamp(total,0.,1.));
}
vec4 classic(vec2 p,float breadth){
  bool perimeter=uOutside>.5&&uDirection>3.5;
  vec2 domain=vec2(p.x*uScale-p.y*uWind*2.,p.y*3.-flowTime()*1.8)+mod(uSeed,997.)*.13;
  vec2 curl=vec2(fbm2(domain*.65+vec2(.2,flowTime()*.12)),fbm2(domain*.65+vec2(5.2,-flowTime()*.087)))-.5;
  float n=fbm2(domain+curl*uTurbulence*3.);float tongues=fbm2(vec2(p.x*uScale*.8+uSeed*.05,flickerTime()*.48));
  if(perimeter){vec3 field=vec3(borderPosition/max(uReach,1.)*uScale*.45,p.y*3.-flowTime()*1.8);n=fbm3(field+uSeed*.05);tongues=fbm3(vec3(borderPosition/max(uReach,1.)*2.1,flickerTime()*.48)+uSeed*.02);}
  float heat=((.24+.85*tongues)*uHeight-p.y+(n-.47)*uTurbulence*.9)/max(uHeight,.1);
  float taper=max(.06,uSpread*(.65-.35*p.y));float envelope=1.-smoothstep(taper*.48,taper,abs(p.x/max(breadth,.1)-p.y*uWind*.15+curl.x*.1*p.y));
  if(perimeter)envelope=1.;
  float body=smoothstep(-.045,.19,heat)*envelope,hot=clamp(heat*2.4,0.,1.);vec3 col=mix(uColor,uColor2,smoothstep(.02,.55,hot));col=mix(col,uColor3,pow(hot,2.6)*.92);
  return vec4(col,clamp((body+exp(-abs(heat)*12.)*envelope*.14)*uIntensity,0.,1.));
}
vec4 coals(vec2 p){
  vec2 q=vec2(p.x*22.,p.y*45.),cell=floor(q),f=fract(q);
  float first=9.,second=9.,identity=0.;
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
    vec2 offset=vec2(float(x),float(y)),id=cell+offset;
    vec2 pos=offset+vec2(hash21(id+uSeed),hash21(id+uSeed+27.1))*.72+.14;
    float d=length(pos-f);
    if(d<first){second=first;first=d;identity=hash21(id+uSeed+81.);}else second=min(second,d);
  }
  float boundary=second-first;
  float crack=exp(-boundary*17.);
  float pulse=.55+.45*noise2(vec2(identity*18.,flickerTime()*.35));
  float heat=(crack*.6+exp(-first*first*7.)*.4)*pulse;
  float envelope=exp(-max(p.y,0.)*26.)*smoothstep(-.008,.007,p.y);
  vec3 col=mix(uColor*.28,uColor2,pow(heat,.8));
  col=mix(col,uColor3,pow(heat,4.)*.3);
  return vec4(col,clamp(envelope*(.5+heat)*uIntensity,0.,1.));
}
vec2 sourceNormal(vec2 p){
  vec2 c=p-uHostSize*.5,q=abs(c)-uHostSize*.5+uRadius;
  if(max(q.x,q.y)<0.)return q.x>q.y?vec2(sign(c.x),0.):vec2(0.,sign(c.y));
  return normalize(max(q,0.)+.00001)*sign(c);
}
float edgeGate(vec2 p,vec2 n){
  float edge=uEdge;
  if(edge>4.5)return 1.;
  if(edge<.5)edge=uDirection<.5?1.:uDirection<1.5?2.:uDirection<2.5?3.:uDirection<3.5?4.:5.;
  if(edge>4.5)return 1.;
  float gate=edge<1.5?n.y:edge<2.5?n.x:edge<3.5?-n.y:-n.x;
  return smoothstep(.05,.45,gate);
}
vec4 directionalBorder(vec2 point){
  vec2 dir=uDirection<.5?vec2(0.,1.):uDirection<1.5?vec2(1.,0.):uDirection<2.5?vec2(0.,-1.):vec2(-1.,0.);
  float count=floor(mix(14.,28.,uDetail)+.5),maxAge=max(.18,uHeight*1.45),stepAge=maxAge/count;
  float thickness=max(2.5,uReach*stepAge*1.12);
  vec3 emitted=vec3(0.);float total=0.;
  // Backtrace the trajectory to its source. Source, direction and visibility are independent.
  for(int j=0;j<28;j++){
    if(float(j)>=count)break;
    float age=(float(j)+.15+.7*hash21(gl_FragCoord.xy+uSeed))*stepAge;
    vec2 buoyancy=vec2(uWind*.28*age*age*uReach,uGravity*.6*age*age*uReach);
    vec2 born=point-dir*age*uReach-buoyancy;
    if(uDirection>3.5){
      dir=sourceNormal(point-buoyancy);
      born=point-dir*age*uReach-buoyancy;
      
    }
    float sd=roundedBox(born-uHostSize*.5,uHostSize*.5,uRadius);
    float band=thickness*(1.+uGravity*age*1.2)+age*uReach*.045*uTurbulence;
    if(abs(sd)>band*1.5)continue;
    vec2 n=sourceNormal(born);float gate=edgeGate(born,n);if(gate<.01)continue;
    vec2 anchor=born-n*sd;
    float lane=abs(n.y)>.55?anchor.x:uHostSize.y-anchor.y;
    float span=abs(n.y)>.55?uHostSize.x:uHostSize.y;
    if(uSpread<1.||abs(uSourceOffset-.5)>.001)gate*=1.-smoothstep(uSpread*.44,uSpread*.5,abs(lane/span-uSourceOffset));
    float jitter=noise2(anchor*.036+vec2(uSeed*.1,flickerTime()*.45));
    vec2 adv=anchor/max(uReach,1.)*uScale*.7+vec2(.37,1.)*(age*3.-flowTime()*1.55);
    float curl=noise2(adv*.7+anchor*.008)*2.-1.;
    float noise=noise2(adv+curl*uTurbulence*1.2+uSeed*.13);
    float top=uHeight*(.45+.58*jitter);
    float life=1.-smoothstep(top*.60,top*1.2,age);
    float body=exp(-pow(sd/max(band,.1),2.)*2.)*gate*life;
    float heat=clamp(.62-age/max(top,.01)*.42+(noise-.5)*.32,0.,1.);
    if(uModel<.5){body*=.48+.52*noise;heat*=.78;}
    else if(uModel<2.5&&uModel>1.5){
      float lanePos=mod(lane/max(uReach*.22,16.),1.)-.5;
      body*=exp(-lanePos*lanePos*45./max(.12,1.-age/max(top,.01)));
    }else if(uModel>2.5){body*=exp(-age*25.);heat*=.8;}
    vec3 col=mix(uColor,uColor2,smoothstep(.08,.7,heat));
    col=mix(col,uColor3,pow(heat,4.)*(uModel<.5?.22:.65));
    float a=clamp(body*(.4+noise*.6)*uIntensity*.78,0.,.82);
    emitted+=col*a*(1.-total);total+=a*(1.-total);
  }
  return vec4(emitted/max(total,.001),total);
}
void main(){
  vec2 point=vUv*uViewSize-vec2(uPadding);float sd=roundedBox(point-uHostSize*.5,uHostSize*.5,min(uRadius,min(uHostSize.x,uHostSize.y)*.5));
  if(uOutside>.5&&uBorder<.5&&sd<-.5){gl_FragColor=vec4(0.);return;}
  if(uOutside>.5){
    vec4 plume=directionalBorder(point);
    if(uBorder<.5)plume.a*=smoothstep(-.5,1.,sd);
    gl_FragColor=vec4(max(plume.rgb,0.),clamp(plume.a,0.,1.));return;
  }
  float breadth;vec2 p=emitter(point,breadth);if(p.y<-.01){gl_FragColor=vec4(0.);return;}
  vec4 result=uModel<.5?ribbons(p,breadth):uModel<1.5?classic(p,breadth):uModel<2.5?candle(p,breadth):vec4(0.);
  if(uModel>2.5){result=coals(p);result.a*=1.-smoothstep(uSpread*.44,uSpread*.5,abs(p.x/max(breadth,.001)));}
  vec2 sparks=vec2(p.x*37.+sin(p.y*4.-flowTime())*.5,p.y*15.-flowTime()*1.8),id=floor(sparks),local=fract(sparks)-vec2(.18+.64*hash21(id+uSeed+9.),.2+.6*hash21(id+uSeed+18.));
  float ember=(1.-smoothstep(.01,.065,length(local*vec2(1.,.36))))*step(.99-uEmbers*.055,hash21(id+uSeed));
  ember*=smoothstep(.03,.13,p.y)*(1.-smoothstep(.65,1.1,p.y))*uEmbers;
  result.rgb=mix(result.rgb,uColor3*1.2,ember);result.a=max(result.a,ember);
  float fade=1.-smoothstep(uOutside>.5?1.28:.98,uOutside>.5?1.48:1.,p.y);result.a*=fade;
  if(uOutside>.5){result.a*=edgeGate(borderPosition,sourceNormal(borderPosition));if(uBorder<.5)result.a*=smoothstep(-.5,1.,sd);}
  gl_FragColor=vec4(max(result.rgb,0.),clamp(result.a,0.,1.));
}`;export{t as FIRE_FRAGMENT};
//# sourceMappingURL=fire.js.map
