/*! Frontend Toolkit 1.0.0. Copyright (c) 2026 Frontend Toolkit contributors.
MIT for project code. Retained upstream material is not relicensed.
Keep the distribution LICENSE, NOTICE.txt and licenses/ files with these modules. */
const e=`
precision highp float;
varying vec2 vUv;
uniform vec2 uResolution;
uniform float uTime,uSeed,uScale,uDensity,uTurbulence,uWind,uSpread,uRise,uLight;
uniform float uHeight,uIntensity,uEmbers,uCoverage,uSoftness,uTransparent;
uniform vec3 uColor,uColor2,uColor3;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){float a=.5,v=0.;mat2 r=mat2(.8,-.6,.6,.8);for(int i=0;i<5;i++){v+=a*noise(p);p=r*p*2.03+13.17;a*=.5;}return v;}
vec2 domain(vec2 p,float t){return vec2(fbm(p+vec2(.2,t)),fbm(p+vec2(5.2,-t*.73)));}
`,o=e+`
void main(){
  vec2 uv=vUv;float t=uTime;float aspect=uResolution.x/max(uResolution.y,1.);
  float x=(uv.x-.5)*aspect;float y=uv.y;
  vec2 p=vec2(x*uScale-y*uWind*2.,y*3.-t*1.8)+mod(uSeed,997.)*.13;
  vec2 curl=domain(p*.65,t*.12)-.5;
  float n=fbm(p+curl*uTurbulence*3.);
  float tongues=fbm(vec2(x*uScale*.8+uSeed*.05,t*.48));
  float top=(.24+.85*tongues)*uHeight;
  float heat=(top-y+(n-.47)*uTurbulence*.9)/max(uHeight,.1);
  float taper=max(.06,uSpread*(.65-.35*y));
  float envelope=1.-smoothstep(taper*.48,taper,abs((uv.x-.5)-y*uWind*.15+curl.x*.1*y));
  float body=smoothstep(-.045,.19,heat)*envelope;
  float hot=clamp(heat*2.4,0.,1.);
  vec3 color=mix(uColor,uColor2,smoothstep(.02,.55,hot));
  color=mix(color,uColor3,pow(hot,2.6)*.92);
  float halo=exp(-abs(heat)*12.)*envelope*.14;
  float alpha=clamp((body+halo)*uIntensity,0.,1.);
  vec2 sp=vec2(uv.x*36.,uv.y*12.-t*1.7);vec2 id=floor(sp),f=fract(sp)-.5;
  float r=hash(id+uSeed);float spark=(1.-smoothstep(.015,.055,length(f*vec2(1.,.4))))*step(.982-uEmbers*.035,r);
  spark*=smoothstep(.1,.35,y)*(1.-smoothstep(.7,1.,y))*uEmbers;
  color+=uColor3*spark*2.;alpha=max(alpha,spark);
  alpha*=1.-smoothstep(.97,1.,y);
  gl_FragColor=vec4(color,alpha);
}`,a=e+`
void main(){
  vec2 uv=vUv;float y=uv.y;float t=uTime;
  float aspect=uResolution.x/max(uResolution.y,1.);
  vec2 p=vec2((uv.x-.5)*aspect,y)*uScale;
  p.x-=y*uWind; p.y-=t*uRise; p+=mod(uSeed,997.)*.17;
  vec2 q=domain(p*.75,t*.06);
  vec2 r=domain(p+q*uTurbulence*2.8,t*.09);
  float n=fbm(p+r*uTurbulence*3.1);
  float center=.5+uWind*y*.16+(q.x-.5)*.36*y*uTurbulence;
  float spread=max(.03,uSpread*(.12+y*.55));
  float env=exp(-pow(abs(uv.x-center)/spread,2.));
  float curl=smoothstep(.28,.79,n)*(.4+.6*r.y);
  float fade=smoothstep(0.,.12,y)*(1.-smoothstep(.65,1.,y));
  float density=curl*env*fade*uDensity*2.8;
  float alpha=1.-exp(-density);
  float illumination=clamp(.42+uLight*(.5+q.x*.35)-density*.22,.12,1.4);
  gl_FragColor=vec4(uColor*illumination,alpha);
}`,t=e+`
float hash3(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise3(vec3 p){
  vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float cloudField(vec3 p){
  float sum=0.,a=.56;
  for(int j=0;j<4;j++){sum+=a*noise3(p);p=p*2.07+vec3(7.1,3.7,5.2);a*=.48;}
  return sum;
}
void main(){
  vec2 uv=vUv;float aspect=uResolution.x/max(uResolution.y,1.);
  vec2 p=vec2(uv.x*aspect,uv.y)*uScale;
  p.x+=uTime*uWind*.14;p+=mod(uSeed,997.)*.19;
  vec3 cloud=vec3(0.);float alpha=0.;
  for(int i=0;i<6;i++){
    float z=float(i)*.16;
    vec3 q=vec3(p+vec2(z*.12,z*.2),z+uTime*.012);
    float n=cloudField(q);
    float threshold=.83-uCoverage*.6;
    float den=smoothstep(threshold,threshold+uSoftness,n)*uDensity*.75;
    float sun=cloudField(q+vec3(-.13,.22,.16));
    float shade=clamp(.9+(n-sun)*4.*uLight-z*.2,.08,1.);
    vec3 lit=mix(uColor2,uColor,shade);
    float a=1.-exp(-den);
    cloud+=(1.-alpha)*lit*a;alpha+=(1.-alpha)*a;
  }
  vec3 sky=mix(uColor3*.86,uColor3,1.-uv.y*.35);
  sky=mix(sky,vec3(.9,.94,.98),pow(1.-uv.y,5.)*.28);
  if(uTransparent>.5)gl_FragColor=vec4(cloud/max(alpha,.001),alpha);
  else gl_FragColor=vec4(cloud+sky*(1.-alpha),1.);
}`;export{t as CLOUDS_FRAGMENT,o as FIRE_FRAGMENT,a as SMOKE_FRAGMENT};
//# sourceMappingURL=atmosphere.js.map
