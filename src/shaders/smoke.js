import {NOISE_GLSL} from './noise.js';

// === RAY-MARCHED DENSITY WITH LIGHT EXTINCTION ===
export const SMOKE_FRAGMENT=`
precision highp float;
varying vec2 vUv;
uniform vec2 uResolution,uPointerDelta;
uniform vec3 uPointer,uColor;
uniform float uTime,uSeed,uScale,uDensity,uTurbulence,uWind,uSpread,uRise,uLight,uSteps,uDepth,uShadow,uLightAngle;
${NOISE_GLSL}
float density(vec3 p){
  float y=p.y;
  float radius=max(.025,uSpread*(.09+.47*y));
  float cx=uWind*y*.27+sin(y*5.2-uTime*uRise*.8)*y*.105*uTurbulence;
  float cz=sin(y*4.7+uTime*uRise*.55)*y*.13*uTurbulence;
  vec2 drift=vec2(p.x-cx,p.z-cz);
  float envelope=exp(-dot(drift*vec2(1.,.8),drift*vec2(1.,.8))/(radius*radius));
  vec3 q=vec3(p.x,p.y-uTime*uRise,p.z)*uScale+mod(uSeed,997.)*.19;
  q.x+=sin(q.y*1.5+q.z+uTime*.1)*uTurbulence*.52;
  q.z+=cos(q.y*1.7-q.x)*uTurbulence*.42;
  float n=fbm3(q*2.1);
  float billow=smoothstep(.37,.70,n);
  float fade=smoothstep(0.,.065,y)*(1.-smoothstep(.63,1.02,y));
  return billow*envelope*fade*uDensity*10.;
}
void main(){
  float aspect=uResolution.x/max(uResolution.y,1.);vec2 uv=vUv;
  vec3 base=vec3((uv.x-.5)*aspect,uv.y,0.);
  if(abs(base.x)>uSpread*1.45+abs(uWind)*.4){gl_FragColor=vec4(0.);return;}
  float angle=radians(uLightAngle);vec3 lightDir=normalize(vec3(sin(angle),.7,-cos(angle)));
  float dt=uDepth/max(uSteps,1.),alpha=0.;vec3 col=vec3(0.);
  float jitter=hash21(gl_FragCoord.xy)*.65;
  for(int i=0;i<64;i++){
    if(float(i)>=uSteps||alpha>.985)break;
    float z=-uDepth*.5+(float(i)+jitter)*dt;vec3 p=base+vec3(0.,0.,z);
    vec2 diff=uv-uPointer.xy;float influence=exp(-dot(diff,diff)*18.)*uPointer.z;
    p.x+=sin(z*7.+uTime)*influence*.09*uTurbulence;p.z+=influence*(uPointerDelta.x*3.+sin(uTime*.5)*.04);
    float d=density(p);if(d<.002)continue;
    float toward=density(p+lightDir*.16),farther=density(p+lightDir*.38);
    float visibility=exp(-(toward*.27+farther*.18)*uShadow);
    float gradient=clamp((d-toward)*.34,-.2,.4);
    float illumination=.10+uLight*(1.02*visibility+gradient*.65);
    float sampleAlpha=1.-exp(-d*dt*2.1);
    col+=(1.-alpha)*sampleAlpha*uColor*illumination;alpha+=(1.-alpha)*sampleAlpha;
  }
  gl_FragColor=vec4(col/max(alpha,.0001),alpha);
}`;
