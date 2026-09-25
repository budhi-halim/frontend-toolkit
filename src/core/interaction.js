// === INTERACTIONS BELONG TO THE MATERIAL, NOT TO A GENERIC CAMERA OFFSET ===
export function allowsPointer(effect,options) {
  if(effect==='highlight')return !['auto','manual'].includes(options.activation)||options.activation==='auto'&&options.motionSource!=='auto';
  if(options.interactive===false)return false;
  if(effect==='sketch'&&options.kind==='lightning')return ['click','both'].includes(options.strikeTrigger);
  if(options.interactionMode==='auto')return false;
  if(effect==='trail')return !['auto','manual'].includes(options.autoEmit?'auto':options.trigger);
  if(effect==='fluid'||effect==='smoke')return true;
  if(effect==='field')return options.kind==='magnetic';
  if(effect==='art')return ['metaballs','interference'].includes(options.kind);
  if(effect==='sketch')return options.kind==='lightning'?['click','both'].includes(options.strikeTrigger):['constellation','blobs'].includes(options.kind);
  return false;
}
export function automaticMotion(effect,options) {
  if(['smoke','art','field'].includes(effect)&&options.interactionMode==='pointer') {
    if(effect==='smoke'||effect==='art'&&['metaballs','interference'].includes(options.kind)||effect==='field'&&options.kind==='magnetic')return false;
  }
  return true;
}
export function cleanPointer(p) {
  if(!p||![p.x,p.y].every(Number.isFinite))return{x:.5,y:.5,dx:0,dy:0,down:false,active:false};
  return {...p,active:Boolean(p.active&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1),dx:Number.isFinite(p.dx)?p.dx:0,dy:Number.isFinite(p.dy)?p.dy:0};
}
