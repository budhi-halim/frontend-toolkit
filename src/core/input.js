import {allowsPointer} from './interaction.js';

// === SHARED, PASSIVE POINTER / FOCUS ADAPTER ===
// The renderer never captures native clicks, keyboard activation or touch scrolling.
export function bindEffectInput(host,{effect,options,deliver}={}){
  if(!host?.addEventListener||typeof deliver!=='function')throw new TypeError('An event target and delivery callback are required.');
  if(typeof effect==='string'&&!['highlight','trail','fluid','smoke','field','art','sketch'].includes(effect))return{reset(){},destroy(){}};
  const effectName=()=>typeof effect==='function'?effect():effect;
  const read=()=>typeof options==='function'?options():options;
  let last=null,disposed=false;
  function cancel(){last=null;deliver({x:.5,y:.5,dx:0,dy:0,active:false,down:false,event:'pointercancel'});}
  function excluded(event,name){return event.composedPath().some(node=>node!==host&&node.matches?.(name==='highlight'?'[data-ft-no-interaction]':'button,a,input,select,textarea,[contenteditable="true"],[data-ft-no-interaction]'));}
  function pointer(event){
    if(disposed)return;const name=effectName(),o=read();if(o.dragEnabled||!allowsPointer(name,o))return;
    if(excluded(event,name)){cancel();return;}if(event.isPrimary===false)return;
    const rect=host.getBoundingClientRect();let samples=[];
    if(event.type==='pointermove'&&event.getCoalescedEvents)try{samples=event.getCoalescedEvents().slice(-64);}catch{}
    if(!samples.length)samples=[event];const end=samples.at(-1);
    if(end!==event&&(end.clientX!==event.clientX||end.clientY!==event.clientY))samples.push(event);
    for(const sample of samples){if(!Number.isFinite(sample.clientX)||!Number.isFinite(sample.clientY))continue;
      const inside=sample.clientX>=rect.left&&sample.clientX<=rect.right&&sample.clientY>=rect.top&&sample.clientY<=rect.bottom;
      const active=inside&&!['pointerleave','pointercancel'].includes(event.type),x=(sample.clientX-rect.left)/Math.max(1,rect.width),y=1-(sample.clientY-rect.top)/Math.max(1,rect.height);
      const next={x,y,dx:last&&active?x-last.x:0,dy:last&&active?y-last.y:0,active,down:event.buttons>0,type:event.pointerType,event:event.type,pointerId:event.pointerId,timeStamp:sample.timeStamp};
      if(event.type==='pointerup'&&event.pointerType!=='mouse')next.active=false;
      last=next.active?next:null;deliver(next);
    }
  }
  function focus(event){
    if(disposed||effectName()!=='highlight'||excluded(event,'highlight'))return;
    if(event.type==='focusout'&&host.contains(event.relatedTarget))return;
    if(event.type==='click'&&event.detail!==0)return;
    if(event.type==='click'&&!event.target.closest?.('button,a,input,[role="button"]'))return;
    const a=host.getBoundingClientRect(),b=event.target.getBoundingClientRect?.()??a;
    deliver({x:Math.max(0,Math.min(1,(b.left+b.width/2-a.left)/Math.max(1,a.width))),y:1-Math.max(0,Math.min(1,(b.top+b.height/2-a.top)/Math.max(1,a.height))),active:event.type!=='focusout',down:false,dx:0,dy:0,event:event.type==='click'?'keyboardactivate':event.type});
  }
  const names=['pointerenter','pointermove','pointerdown','pointerup','pointerleave','pointercancel'];
  for(const name of names)host.addEventListener(name,pointer,{passive:true});
  for(const name of ['focusin','focusout','click'])host.addEventListener(name,focus,{passive:true});
  window.addEventListener('blur',cancel);
  return{reset:cancel,destroy(){if(disposed)return;disposed=true;for(const name of names)host.removeEventListener(name,pointer);for(const name of ['focusin','focusout','click'])host.removeEventListener(name,focus);window.removeEventListener('blur',cancel);last=null;}};
}
