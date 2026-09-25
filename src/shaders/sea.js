import {NOISE_GLSL} from './noise.js';
import {SEA_WAVES_GLSL} from '../core/sea-model.js';

// === HEIGHT-FIELD SEA WITH A REFLECTED SKY AND DISTANCE-ATTENUATED DETAIL ===
export const SEA_FRAGMENT=`
precision highp float;
varying vec2 vUv;
uniform vec2 uResolution;
uniform vec3 uSky,uHorizonColor,uWater,uSunColor;
uniform float uTime,uSeed,uAmplitude,uChop,uScale,uWind,uHorizon,uSunElevation,uSunAzimuth,uSunSize,uFog,uReflection,uDetail,uWaveSpeed,uWaveDirection,uRipples;
${NOISE_GLSL}
${SEA_WAVES_GLSL}
vec3 sunDirection(){return normalize(vec3(uSunAzimuth,uSunElevation,1.));}
vec3 sky(vec3 ray){
  float elevation=clamp(ray.y,0.,1.);
  vec3 c=mix(uHorizonColor,uSky,smoothstep(0.,.55,elevation));
  float alignment=max(dot(ray,sunDirection()),0.);
  float disc=1.-smoothstep(uSunSize,uSunSize+.003,acos(clamp(alignment,-1.,1.)));
  c+=uSunColor*(pow(alignment,90.)*.4+pow(alignment,9.)*.08+disc*.75)*smoothstep(-.08,.02,uSunElevation);
  vec2 cloudUV=ray.xz/max(.22,ray.y)*1.5+vec2(uTime*.005,0.);
  float cloud=smoothstep(.60,.83,fbm2(cloudUV+uSeed*.04));
  c=mix(c,mix(uHorizonColor,uSky,.28)*1.12,cloud*.23*smoothstep(.01,.25,ray.y));
  return c;
}
void main(){
  float aspect=uResolution.x/max(uResolution.y,1.);
  vec2 view=vec2((vUv.x-.5)*aspect,vUv.y-uHorizon);
  vec3 eye=vec3(0.,2.3,0.),ray=normalize(vec3(view,1.12));
  vec3 col=sky(ray);
  if(ray.y<-.004){
    // Bracket the bounded surface, then refine it. An unbracketed fixed-point
    // update can settle on the same ridge and make moving waves look pinned.
    float bound=max(.002,uAmplitude*4.0),nearT=max(.02,(eye.y-bound)/(-ray.y)),farT=min(800.,(eye.y+bound)/(-ray.y));
    nearT=min(nearT,farT-.01);
    float lo=nearT,hi=farT;
    float flo=(eye+ray*lo).y-surfaceAt((eye+ray*lo).xz,lo).x;
    float fhi=(eye+ray*hi).y-surfaceAt((eye+ray*hi).xz,hi).x;
    float t=(lo+hi)*.5;
    for(int i=0;i<9;i++){
      float ratio=clamp(flo/max(flo-fhi,.00001),.08,.92);
      t=mix(lo,hi,mix(.5,ratio,.8));
      vec3 q=eye+ray*t;float f=q.y-surfaceAt(q.xz,t).x;
      if(f>0.){lo=t;flo=f;}else{hi=t;fhi=f;}
    }
    vec3 p=eye+ray*t;vec3 surface=surfaceAt(p.xz,t);
    vec3 n=normalize(vec3(-surface.y,1.,-surface.z));
    vec3 reflected=reflect(ray,n);reflected.y=max(.003,reflected.y);
    float fresnel=.04+.96*pow(1.-max(dot(-ray,n),0.),5.);
    float diffuse=.42+.32*max(dot(n,sunDirection()),0.);
    vec3 water=uWater*diffuse+uWater*max(p.y,0.)*.18;
    water=mix(water,sky(normalize(reflected)),clamp(fresnel*uReflection+.13,0.,1.));
    float roughness=.025+t*.00012;
    float spec=pow(max(dot(reflect(-sunDirection(),n),-ray),0.),1./roughness);
    water+=uSunColor*spec*.72*smoothstep(-.04,.07,uSunElevation);
    float haze=1.-exp(-t*uFog*.4);
    water=mix(water,uHorizonColor,haze*.92);
    col=mix(col,water,smoothstep(.004,.015,-ray.y));
  }
  gl_FragColor=vec4(clamp(col,0.,1.),1.);
}`;
