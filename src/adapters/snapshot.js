// === OPTIONAL, ISOLATED DOM CAPTURE ===
// Native foreignObject capture is the default. An injected html2canvas renderer is an optional compatibility path.
const scripts=new Map();let queue=Promise.resolve(),queued=0,colorContext;
function loadLibrary(url,{nonce,integrity}={}){
  const parsed=new URL(url,document.baseURI);if(!['https:','http:','file:','blob:'].includes(parsed.protocol))return Promise.reject(new TypeError('Unsupported capture-library protocol.'));
  const key=parsed.href;if(scripts.has(key))return scripts.get(key);
  const task=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=key;script.async=true;if(nonce)script.nonce=nonce;if(integrity){script.integrity=integrity;script.crossOrigin='anonymous';}
    const fail=()=>{clearTimeout(timer);script.remove();scripts.delete(key);reject(new Error('The optional capture library could not be loaded.'));};
    const timer=setTimeout(fail,20000);script.onerror=fail;script.onload=()=>{clearTimeout(timer);if(typeof globalThis.html2canvas!=='function'){fail();return;}resolve(globalThis.html2canvas);};document.head.append(script);
  });scripts.set(key,task);return task;
}
function rgba(color){
  if(!colorContext){const c=document.createElement('canvas');c.width=c.height=1;colorContext=c.getContext('2d',{willReadFrequently:true});}
  colorContext.clearRect(0,0,1,1);colorContext.fillStyle='transparent';colorContext.fillStyle=color;colorContext.fillRect(0,0,1,1);const p=colorContext.getImageData(0,0,1,1).data;return`rgba(${p[0]},${p[1]},${p[2]},${p[3]/255})`;
}
function compatibleColors(value){
  const pattern=/\b(?:oklch|oklab|lab|lch|color-mix|color|light-dark)\(/g;let result='',cursor=0,match;
  while((match=pattern.exec(value))){let end=pattern.lastIndex,depth=1;while(end<value.length&&depth){if(value[end]==='(')depth++;else if(value[end]===')')depth--;end++;}if(depth)break;result+=value.slice(cursor,match.index)+rgba(value.slice(match.index,end));cursor=end;pattern.lastIndex=end;}
  return(result+value.slice(cursor)).replace(/\bin\s+(?:oklab|oklch|srgb-linear|srgb|lab|lch)(?:\s+(?:shorter|longer|increasing|decreasing)\s+hue)?\s*,?/g,'');
}
function copyStyle(style,target){
  for(const property of style){if(property.startsWith('--')||property==='animation'||property.startsWith('animation-')||property==='transition'||property.startsWith('transition-'))continue;let value=style.getPropertyValue(property);if(/oklch\(|oklab\(|\blab\(|\blch\(|\bcolor\(|color-mix\(|light-dark\(/.test(value))value=compatibleColors(value);target.style.setProperty(property,value);}
  target.style.animation='none';target.style.transition='none';target.style.caretColor='transparent';
}
function cloneVisual(node,doc){
  if(node.nodeType===3)return doc.createTextNode(node.textContent);if(node.nodeType!==1)return null;
  if(['SCRIPT','STYLE','LINK','IFRAME','OBJECT','EMBED','NOSCRIPT'].includes(node.tagName.toUpperCase())||node.hasAttribute('data-ft-capture-ignore'))return null;
  const computed=getComputedStyle(node);if(computed.display==='none')return null;
  let copy;
  if(node.tagName==='CANVAS'){copy=doc.createElement('img');try{copy.src=node.toDataURL();}catch{throw new Error('A canvas in the capture is cross-origin tainted.');}}
  else if(node.tagName==='VIDEO'){throw new Error('Capture video through the direct water video source API.');}
  else if(node.tagName.includes('-'))copy=doc.createElement('div');
  else copy=doc.importNode(node.cloneNode(false),false);
  for(const attribute of [...copy.attributes])if(attribute.name.startsWith('on')||['autofocus','id','class','style','srcset'].includes(attribute.name))copy.removeAttribute(attribute.name);
  copyStyle(computed,copy);
  if(node.tagName==='IMG'){copy.src=node.currentSrc||node.src;copy.removeAttribute('loading');}
  if(['INPUT','TEXTAREA','SELECT'].includes(node.tagName)){copy.value=node.value;if('checked'in node)copy.checked=node.checked;}
  const pseudo=which=>{const style=getComputedStyle(node,which),content=style.content;if(!content||['none','normal'].includes(content))return null;const el=doc.createElement('span');copyStyle(style,el);el.textContent=/^["'].*["']$/.test(content)?content.slice(1,-1):'';return el;};
  const before=pseudo('::before');if(before)copy.append(before);
  for(const child of node.childNodes){const clone=cloneVisual(child,doc);if(clone)copy.append(clone);}const after=pseudo('::after');if(after)copy.append(after);return copy;
}
function imageFromURL(url,signal){
  return new Promise((resolve,reject)=>{const image=new Image();let done=false;const finish=error=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);image.onload=image.onerror=null;error?reject(error):resolve(image);};const abort=()=>finish(new DOMException('Capture cancelled.','AbortError'));const timer=setTimeout(()=>finish(new Error('Snapshot image decoding timed out.')),15000);if(signal?.aborted){abort();return;}signal?.addEventListener('abort',abort,{once:true});image.onload=()=>finish();image.onerror=()=>finish(new Error('The browser could not rasterize this HTML snapshot.'));if(/^https?:/.test(url))image.crossOrigin='anonymous';image.src=url;});
}
async function nativeCapture(clone,{width,height,scale,signal}){
  const resources=new Map();
  async function embed(url){
    if(url.startsWith('data:')||url.startsWith('#'))return url;
    if(resources.has(url))return resources.get(url);
    if(resources.size>=48)throw new Error('Snapshot exceeds the 48-image embedding budget.');
    const result=(async()=>{const loaded=await imageFromURL(url,signal),surface=document.createElement('canvas'),factor=Math.min(1,2048/Math.max(loaded.naturalWidth,loaded.naturalHeight));surface.width=Math.max(1,Math.round(loaded.naturalWidth*factor));surface.height=Math.max(1,Math.round(loaded.naturalHeight*factor));surface.getContext('2d').drawImage(loaded,0,0,surface.width,surface.height);try{return surface.toDataURL('image/png');}catch{throw new Error('An image cannot be embedded because its server does not permit CORS capture.');}finally{surface.width=surface.height=1;}})();resources.set(url,result);return result;
  }
  const elements=[clone,...clone.querySelectorAll('*')];
  for(const element of elements){
    if(element.tagName==='IMG')element.src=await embed(element.src);
    for(const property of ['background-image','border-image-source','mask-image','-webkit-mask-image']){
      const value=element.style?.getPropertyValue(property);if(!value?.includes('url('))continue;
      const matches=[...value.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/g)];let replaced=value;
      for(const match of matches){const url=(match[1]??match[2]??match[3]).trim();if(!url.startsWith('#'))replaced=replaced.replace(match[0],`url("${await embed(new URL(url,document.baseURI).href)}")`);}
      element.style.setProperty(property,replaced);
    }
  }
  const serialized=new XMLSerializer().serializeToString(clone),svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject x="0" y="0" width="100%" height="100%">${serialized}</foreignObject></svg>`;
  const image=await imageFromURL('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg),signal),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));const context=canvas.getContext('2d');context.drawImage(image,0,0,canvas.width,canvas.height);
  try{context.getImageData(0,0,1,1);}catch{throw new Error('This browser restricts HTML-to-canvas capture. Use an explicit image source or provide a compatible capture renderer.');}return canvas;
}
function awaitCapture(task,signal){
  return new Promise((resolve,reject)=>{
    let done=false;const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);error?reject(error):resolve(value);};
    const abort=()=>finish(new DOMException('Capture cancelled.','AbortError')),timer=setTimeout(()=>finish(new Error('Capture exceeded the 30-second time budget.')),30000);
    Promise.resolve(task).then(value=>finish(null,value),error=>finish(error));if(signal?.aborted){abort();return;}signal?.addEventListener('abort',abort,{once:true});
  });
}
function aborted(signal){if(signal?.aborted)throw new DOMException('Capture cancelled.','AbortError');}
export function captureDOM(target,{renderer=globalThis.html2canvas,libraryURL,scale=1,maxPixels=2097152,signal,nonce,integrity,...engineOptions}={}){
  if(!(target instanceof HTMLElement))return Promise.reject(new TypeError('Capture needs an HTML element.'));
  if(queued>=16)return Promise.reject(new Error('Too many queued captures. Coalesce or debounce requests.'));
  queued++;
  const run=async()=>{
    let staging=null;const localAbort=new AbortController(),forwardAbort=()=>localAbort.abort();signal?.addEventListener('abort',forwardAbort,{once:true});
    try{
      aborted(signal);if(!target.isConnected)throw new Error('Capture target is detached.');
      const capture=renderer||(libraryURL?await loadLibrary(libraryURL,{nonce,integrity}):null);if(capture!==null&&typeof capture!=='function')throw new TypeError('The capture renderer must be a function.');aborted(signal);
      const rect=target.getBoundingClientRect(),width=Math.max(1,target.offsetWidth||rect.width),height=Math.max(1,target.offsetHeight||rect.height);if(rect.width<1||rect.height<1)throw new Error('Capture target has no visible layout size.');
      const requestedScale=Math.min(2,Math.max(.1,Number(scale)||1)),pixelLimit=Math.max(1,Math.min(16777216,Number(maxPixels)||2097152));
      const factor=Math.min(requestedScale,Math.sqrt(pixelLimit/(width*height)),4096/width,4096/height);
      staging=document.createElement('iframe');staging.setAttribute('aria-hidden','true');staging.tabIndex=-1;staging.setAttribute('sandbox','allow-same-origin');staging.dataset.ftCapture='';Object.assign(staging.style,{position:'fixed',left:'-100000px',top:'0',width:`${width}px`,height:`${height}px`,border:'0',pointerEvents:'none',visibility:'hidden'});document.body.append(staging);
      const doc=staging.contentDocument;doc.documentElement.style.margin='0';doc.body.style.margin='0';doc.body.style.background='transparent';const clone=cloneVisual(target,doc);if(!clone)throw new Error('Capture target is hidden.');
      Object.assign(clone.style,{margin:'0',position:'relative',inset:'auto',transform:'none',translate:'none',width:`${width}px`,height:`${height}px`,boxSizing:'border-box'});doc.body.append(clone);aborted(signal);
      const canvas=capture?await awaitCapture(capture(clone,{...engineOptions,backgroundColor:null,scale:factor,width,height,useCORS:true,allowTaint:false,logging:false,imageTimeout:8000,removeContainer:true,onclone:(clonedDoc,clonedTarget)=>{aborted(signal);engineOptions.onclone?.(clonedDoc,clonedTarget);}}),localAbort.signal):await awaitCapture(nativeCapture(clone,{width,height,scale:factor,signal:localAbort.signal}),localAbort.signal);aborted(signal);if(!canvas||typeof canvas.getContext!=='function'||canvas.width<1||canvas.height<1)throw new TypeError('The capture renderer did not return a usable canvas.');return canvas;
    }finally{localAbort.abort();signal?.removeEventListener('abort',forwardAbort);staging?.remove();queued--;}
  };
  const result=queue.then(run,run);queue=result.catch(()=>{});return result;
}
export function bindWaterSnapshot(water,target,{observe=false,debounce=250,onError=()=>{},...options}={}){
  if(!water||!('source'in water))throw new TypeError('A water element is required.');if(target===water||target.contains(water))throw new TypeError('The capture source must not contain the water output.');
  const abort=new AbortController();let disposed=false,timer=0,busy=false,dirty=false,revision=0;
  async function refresh(){
    if(disposed)return;if(busy){dirty=true;return;}busy=true;const current=++revision;
    try{const canvas=await captureDOM(target,{...options,signal:abort.signal});if(!disposed&&revision===current)water.source=canvas;}
    catch(error){if(!disposed&&error.name!=='AbortError')onError(error);}finally{busy=false;if(dirty&&!disposed){dirty=false;invalidate();}}
  }
  function invalidate(){if(disposed)return;clearTimeout(timer);timer=setTimeout(refresh,Math.max(50,debounce));}
  const mutation=observe?new MutationObserver(invalidate):null,resize=observe?new ResizeObserver(invalidate):null;mutation?.observe(target,{subtree:true,childList:true,attributes:true,characterData:true});resize?.observe(target);invalidate();
  return{refresh,invalidate,destroy(){if(disposed)return;disposed=true;revision++;abort.abort();clearTimeout(timer);mutation?.disconnect();resize?.disconnect();}};
}
