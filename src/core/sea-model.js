// === SIGNED TRAVELLING WAVES; THE CPU AND GLSL PATHS SHARE THESE COEFFICIENTS ===
// World units are artistic, not a georeferenced ocean forecast.
export function seaSurface(x,z,time,options,distance=0) {
  let height=0,dx=0,dz=0,frequency=.62*options.waveScale,amplitude=options.waveHeight;
  const heading=options.waveDirection*Math.PI/180,detail=Math.max(2,Math.min(7,Math.round(options.detail)));
  for(let i=0;i<detail;i++) {
    const angle=heading+(i===0?0:i===1?.72:i*2.39996),cx=Math.cos(angle),cz=Math.sin(angle);
    const phase=(x*cx+z*cz)*frequency-time*options.waveSpeed*Math.sqrt(9.81*frequency)+i*13.71+options.seed*.137;
    const harmonic=options.choppiness*.10/(1+i),s=Math.sin(phase),c=Math.cos(phase);
    const footprint=distance*frequency*.003,attenuation=1/(1+footprint*footprint);
    const a=amplitude*attenuation*(i<2?1:options.ripples*(.5+options.wind)*1.6);
    height+=a*(s-harmonic*Math.cos(2*phase));
    const slope=a*frequency*(c+2*harmonic*Math.sin(2*phase));dx+=slope*cx;dz+=slope*cz;
    amplitude*=.43;frequency*=1.86;
  }
  return {height,dx,dz};
}
export const SEA_WAVES_GLSL=`
vec3 surfaceAt(vec2 p,float distance){
  vec3 result=vec3(0.);float amplitude=uAmplitude,frequency=.62*uScale;
  for(int i=0;i<7;i++){
    if(float(i)>=uDetail)break;
    float k=float(i),angle=uWaveDirection+(i==0?0.:i==1?.72:k*2.39996);
    vec2 d=vec2(cos(angle),sin(angle));
    float phase=dot(p,d)*frequency-uTime*uWaveSpeed*sqrt(9.81*frequency)+k*13.71+uSeed*.137;
    float harmonic=uChop*.10/(1.+k),footprint=distance*frequency*.003;
    float a=amplitude/(1.+footprint*footprint)*(i<2?1.:uRipples*(.5+uWind)*1.6);
    result.x+=a*(sin(phase)-harmonic*cos(2.*phase));
    result.yz+=a*frequency*(cos(phase)+2.*harmonic*sin(2.*phase))*d;
    frequency*=1.86;amplitude*=.43;
  }
  return result;
}
`;
