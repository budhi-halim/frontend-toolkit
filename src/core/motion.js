// === ACCESSIBLE PRESENTATION IS INDEPENDENT OF RENDER QUALITY ===
const calmSurface=(effect,options)=>effect==='water'||effect==='sea'||effect==='field'&&options.kind==='ocean';
const transient=(effect,options)=>(effect==='highlight'&&['ripple','sheen','sparkle'].includes(options.kind))||['fire','trail','fluid','fall'].includes(effect)||effect==='field'&&options.kind==='rain'||effect==='sketch'&&options.kind==='lightning';
export function resolveMotion(effect,options,systemReduced) {
  const reduced=options.motion==='never'||(systemReduced&&options.motion!=='always');
  if(!reduced)return 'full';
  const requested=options.reducedMotion||'auto';
  if(requested==='hide'||requested==='still')return requested;
  if(requested==='subtle') {
    // A slow playback clock is not a safe substitute for suppressing lightning.
    if(effect==='sketch'&&options.kind==='lightning')return 'hide';
    if(options.motion!=='never')return 'subtle';
  }
  // "calm" is a semantic replacement, not an arbitrary frozen frame.
  if(calmSurface(effect,options))return 'calm';
  if(transient(effect,options))return 'hide';
  return 'still';
}
export function presentationOptions(effect,options,presentation) {
  if(effect==='status'&&presentation!=='full')return {...options,shimmer:false,amplitude:0};
  if(effect==='highlight'&&['still','calm'].includes(presentation))return {...options,activation:'manual',idleIntensity:options.idleIntensity,follow:0};
  if(effect==='water'&&presentation==='calm')return {...options,distortion:0,caustic:0,contentDistortion:0,flowSpeed:0,morphSpeed:0};
  if(effect==='sea'&&presentation==='calm')return {...options,waveHeight:0,ripples:0,wind:0,waveSpeed:0};
  if(effect==='field'&&options.kind==='ocean'&&presentation==='calm')return {...options,oceanAmplitude:0};
  if(effect==='water'&&presentation==='subtle')return {...options,distortion:options.distortion*.15,caustic:options.caustic*.2,contentDistortion:0};
  if(effect==='sea'&&presentation==='subtle')return {...options,waveHeight:options.waveHeight*.2,ripples:options.ripples*.25};
  return options;
}
