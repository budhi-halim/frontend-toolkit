// === OPT-IN POINTER + KEYBOARD DRAGGING ===
export function makeDraggable(element,{handle=element,bounds=element.parentElement,onChange=()=>{},x=0,y=0}={}){
  if(!element||!handle)throw new TypeError('A draggable element and handle are required.');
  let position={x:Number(x)||0,y:Number(y)||0},active=null,disposed=false;
  const saved={translate:element.style.translate,touchAction:handle.style.touchAction,cursor:handle.style.cursor,tabindex:handle.getAttribute('tabindex')};
  handle.style.touchAction='none';handle.style.cursor='grab';if(!handle.hasAttribute('tabindex'))handle.tabIndex=0;
  function commit(next,notify=true){position={x:next.x,y:next.y};element.style.translate=`${position.x}px ${position.y}px`;if(notify)onChange({...position});}
  function clamp(next){
    if(!bounds)return next;
    const parent=(typeof bounds==='function'?bounds():bounds)?.getBoundingClientRect();if(!parent)return next;
    const rect=element.getBoundingClientRect();
    const left=rect.left-position.x,top=rect.top-position.y;
    const minX=parent.left-left,maxX=parent.right-left-rect.width,minY=parent.top-top,maxY=parent.bottom-top-rect.height;
    return{x:minX>maxX?(minX+maxX)/2:Math.max(minX,Math.min(maxX,next.x)),y:minY>maxY?(minY+maxY)/2:Math.max(minY,Math.min(maxY,next.y))};
  }
  function down(event){
    if(disposed||event.button!==0||active)return;
    if(handle===element&&event.composedPath().some(node=>node!==element&&node?.matches?.('button,a,input,textarea,select,[contenteditable]')))return;
    active={id:event.pointerId,startX:event.clientX,startY:event.clientY,...position};handle.setPointerCapture(event.pointerId);handle.style.cursor='grabbing';event.preventDefault();
  }
  function move(event){if(active?.id!==event.pointerId)return;commit(clamp({x:active.x+event.clientX-active.startX,y:active.y+event.clientY-active.startY}));}
  function up(event){if(active?.id!==event.pointerId)return;active=null;if(handle.hasPointerCapture(event.pointerId))handle.releasePointerCapture(event.pointerId);handle.style.cursor='grab';}
  function key(event){if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key))return;if(event.target!==handle)return;event.preventDefault();const step=event.shiftKey?24:6;commit(clamp(event.key==='Home'?{x:0,y:0}:{x:position.x+(event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0),y:position.y+(event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0)}));}
  function native(event){event.preventDefault();}
  handle.addEventListener('pointerdown',down);handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',up);handle.addEventListener('pointercancel',up);handle.addEventListener('lostpointercapture',up);handle.addEventListener('keydown',key);handle.addEventListener('dragstart',native);
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>{if(disposed)return;const next=clamp(position);if(Math.abs(next.x-position.x)>.01||Math.abs(next.y-position.y)>.01)commit(next);}):null;observer?.observe(element);if(bounds?.nodeType===1)observer?.observe(bounds);
  commit(position,false);
  return{get position(){return{...position};},setPosition(next){commit(clamp({x:Number(next.x)||0,y:Number(next.y)||0}));},reset(){commit(clamp({x:0,y:0}));},constrain(){commit(clamp(position));},destroy(){if(disposed)return;disposed=true;observer?.disconnect();if(active&&handle.hasPointerCapture(active.id))handle.releasePointerCapture(active.id);active=null;for(const [name,fn]of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',up],['lostpointercapture',up],['keydown',key],['dragstart',native]])handle.removeEventListener(name,fn);element.style.translate=saved.translate;handle.style.touchAction=saved.touchAction;handle.style.cursor=saved.cursor;if(saved.tabindex===null)handle.removeAttribute('tabindex');else handle.setAttribute('tabindex',saved.tabindex);}};
}
