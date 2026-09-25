/*! Frontend Toolkit 1.0.0. Copyright (c) 2026 Frontend Toolkit contributors.
MIT for project code. Retained upstream material is not relicensed.
Keep the distribution LICENSE, NOTICE.txt and licenses/ files with these modules. */
function w(m,v,M,e,q=0){let i=0,n=0,r=0,t=.62*e.waveScale,s=e.waveHeight;const S=e.waveDirection*Math.PI/180,y=Math.max(2,Math.min(7,Math.round(e.detail)));for(let a=0;a<y;a++){const u=S+(a===0?0:a===1?.72:a*2.39996),l=Math.cos(u),o=Math.sin(u),c=(m*l+v*o)*t-M*e.waveSpeed*Math.sqrt(9.81*t)+a*13.71+e.seed*.137,h=e.choppiness*.1/(1+a),g=Math.sin(c),x=Math.cos(c),f=q*t*.003,k=1/(1+f*f),d=s*k*(a<2?1:e.ripples*(.5+e.wind)*1.6);i+=d*(g-h*Math.cos(2*c));const p=d*t*(x+2*h*Math.sin(2*c));n+=p*l,r+=p*o,s*=.43,t*=1.86}return{height:i,dx:n,dz:r}}const A=`
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
`;export{A as SEA_WAVES_GLSL,w as seaSurface};
//# sourceMappingURL=sea-model.js.map
