import {NOISE_GLSL} from './noise.js';

// === ORIGINAL OPTICAL STUDIES; NO EXTERNAL SCENE OR TEXTURE DEPENDENCIES ===
export const ART_FRAGMENT=`
precision highp float;
varying vec2 vUv;
uniform vec2 uResolution;
uniform vec3 uPointer,uColor,uColor2,uBackground;
uniform vec4 uBodies[10];
uniform float uTime,uSeed,uKind,uScale,uAmount,uRelief,uLightAngle,uTransparent,uDetail;
${NOISE_GLSL}
float smoothUnion(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float blobs(vec3 p){
  float d=10.;
  for(int i=0;i<10;i++){
    if(float(i)>=uAmount)break;
    vec3 center=uBodies[i].xyz;float radius=uBodies[i].w;
    d=smoothUnion(d,length(p-center)-radius,.28+uRelief*.18);
  }
  return d;
}
vec3 environment(vec3 n){
  float gradient=clamp(n.y*.5+.5,0.,1.);
  vec3 base=mix(uColor*.16,uColor2*.65,gradient);
  float band=pow(.5+.5*sin(n.y*6.+n.x*1.3),16.);
  float panel=pow(max(dot(n,normalize(vec3(-.6,.8,.7))),0.),30.);
  return base+uColor2*band*.75+vec3(1.)*panel*.8;
}
float fabric(vec2 p){
  float fold=p.x*uAmount+p.y*1.4+sin(p.y*1.8+uTime*.16)*uRelief*2.;
  return sin(fold)*.6+sin(fold*.52+uTime*.08)*.28+fbm2(p*1.7+vec2(uTime*.018,0.))*.3*uRelief;
}
void main(){
  float aspect=uResolution.x/max(uResolution.y,1.);
  vec2 p=(vUv-.5)*vec2(aspect,1.)*uScale;
  vec3 col=uBackground;float alpha=uTransparent>.5?0.:1.;
  if(uKind<.5){
    vec3 ro=vec3(0.,0.,3.5),rd=normalize(vec3(p*2.,-2.8));
    float t=1.2,hit=0.,limit=mix(24.,60.,uDetail);
    for(int step=0;step<60;step++){
      if(float(step)>=limit)break;
      vec3 q=ro+rd*t;float d=blobs(q);
      if(d<.0018){hit=1.;break;}t+=d*.85;if(t>5.6)break;
    }
    if(hit>.5){
      vec3 q=ro+rd*t;float e=.004;
      vec3 n=normalize(vec3(blobs(q+vec3(e,0,0))-blobs(q-vec3(e,0,0)),blobs(q+vec3(0,e,0))-blobs(q-vec3(0,e,0)),blobs(q+vec3(0,0,e))-blobs(q-vec3(0,0,e))));
      vec3 light=normalize(vec3(cos(uLightAngle),sin(uLightAngle),1.1));
      float diffuse=max(dot(n,light),0.),fresnel=pow(1.-max(dot(n,-rd),0.),3.);
      col=mix(uColor*(.25+.6*diffuse),environment(reflect(rd,n)),.64+fresnel*.3);
      col+=uColor2*pow(max(dot(reflect(-light,n),-rd),0.),48.)*.7;
      alpha=1.;
    }
  }else if(uKind<1.5){
    vec2 q=mat2(.91,-.41,.41,.91)*p;
    float h=fabric(q),e=max(.006,2./uResolution.y);
    vec3 n=normalize(vec3((h-fabric(q+vec2(e,0.)))/e,(h-fabric(q+vec2(0.,e)))/e,1.6));
    vec3 light=normalize(vec3(cos(uLightAngle),sin(uLightAngle),1.));
    float sheen=pow(max(dot(n,light),0.),5.);
    col=mix(uColor*.22,uColor,.35+.22*h)+uColor2*sheen*.7;
    float weave=.995+.005*sin(q.y*uResolution.y*1.5);
    col*=weave;alpha=1.;
  }else if(uKind<2.5){
    vec2 a=vec2(-.48,.07),b=vec2(.48,-.07);
    if(uPointer.z>.5)b=(uPointer.xy-.5)*vec2(aspect,1.)*uScale;
    float r1=length(p-a),r2=length(p-b),frequency=uAmount*3.;
    float sum=sin(r1*frequency-uTime*.45)+sin(r2*frequency-uTime*.45);
    float bright=pow(abs(sum)*.5,3.);
    vec3 hue=.5+.5*cos(vec3(0.,2.1,4.2)+(r1-r2)*frequency*.23+uTime*.06);
    col=mix(uColor,uColor2,smoothstep(-2.,2.,sum))*.24+hue*bright*.9;
    alpha=uTransparent>.5?clamp(bright+.12,0.,1.):1.;
  }else{
    vec2 q=p;
    float r=length(q),angle=r>.000001?atan(q.y,q.x):0.,travel=-log(max(r,.018));
    float twist=angle+travel*uRelief*.7-uTime*.12;
    float line=pow(.5+.5*cos(twist*uAmount),22.);
    float ring=pow(.5+.5*cos(travel*12.-uTime*.9),28.);
    float envelope=smoothstep(.02,.12,r)*(1.-smoothstep(.9,1.8,r));
    // The palette must repeat after a full turn, just like the tunnel geometry.
    col=uBackground+mix(uColor,uColor2,.5+.5*sin(travel+angle))*(line*.5+ring*.6)*envelope;
    alpha=uTransparent>.5?clamp((line+ring)*envelope,0.,1.):1.;
  }
  gl_FragColor=vec4(max(col,0.),alpha);
}`;
