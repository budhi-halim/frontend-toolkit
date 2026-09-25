import {bindEffectInput} from './core/input.js';
import {EFFECT_NAMES,getRenderer,loadEffect,afterLoad} from './core/catalog.js';
import {createController} from './core/controller.js';
import {makeDraggable} from './core/drag.js';
import {allowsPointer} from './core/interaction.js';
import {captureDOM} from './adapters/snapshot.js';
import {COMMON_SCHEMA,SCHEMAS,PRESETS,getDefaults,normalizeOptions} from './core/schema.js';
import {kebab,emit,svgNode,uid} from './core/utils.js';

// === DECLARATIVE WEB COMPONENTS ===
const HTMLElementBase=globalThis.HTMLElement??class {};
const observed=[...new Set(['effect','material','type','preset','src','loading','preload',...Object.keys(COMMON_SCHEMA).map(kebab),...Object.values(SCHEMAS).flatMap(schema=>Object.keys(schema).map(kebab))])];
const TEMPLATE_CSS=':host{display:block;position:relative;border-radius:inherit;min-width:0}.layer{position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:0}.content{position:relative;z-index:1;min-width:0;min-height:inherit;border-radius:inherit}slot{display:contents}';
const surfaceNames=SCHEMAS.surface.material.values;
const aliases={glass:{distortion:'--glass-distortion',frosting:'--glass-frosting',blur:'--glass-blur',brightness:'--glass-brightness',edgeColor:'--glass-edge-color'},surface:{orientation:'--vfx-orientation',color:'--vfx-color',grainX:'--vfx-grain-x',grainY:'--vfx-grain-y',detail:'--vfx-detail',depth:'--vfx-depth',roughness:'--vfx-roughness'},water:{flowSpeed:'--water-flow-speed',morphSpeed:'--water-morph-speed',scale:'--water-scale',windX:'--water-wind-x',windY:'--water-wind-y',distortion:'--water-distortion',caustic:'--water-caustic',ridge:'--water-ridge',tint:'--water-tint',tintOpacity:'--water-tint-opacity',highlight:'--water-highlight'}};
export class EffectElement extends HTMLElementBase{
  static effect='';static get observedAttributes(){return observed;}
  constructor(){
    super();this._config={};this._controller=null;this._kind='';this._queued=false;this._source=null;this._sourceSeen=null;this._generation=0;this._loadRequest=false;this._loadingStatus='Not connected';
    this.attachShadow({mode:'open'});const style=document.createElement('style');style.textContent=TEMPLATE_CSS;
    this._layer=document.createElement('div');this._layer.className='layer';this._layer.setAttribute('part','effect');this._layer.setAttribute('aria-hidden','true');
    this._content=document.createElement('div');this._content.className='content';this._content.setAttribute('part','content');this._content.append(document.createElement('slot'));this.shadowRoot.append(style,this._layer,this._content);
    this._requestRefresh=()=>{if(this._queued)return;this._queued=true;queueMicrotask(()=>{this._queued=false;if(this.isConnected)this.refresh();});};this._mutation=new MutationObserver(this._requestRefresh);

  }
  connectedCallback(){
    this._motionEvent=event=>{if(event.target===this&&this._kind==='water')this._content.style.filter=['calm','hide','still','subtle'].includes(event.detail.presentation)?'':this.options.contentMode==='submerged'?`url(#${this._waterId})`:'';};
    this.addEventListener('ft-motion',this._motionEvent);
    this._inputBinding=bindEffectInput(this,{effect:this.constructor.effect||(()=>this.resolveEffect()),options:()=>this._controller?.options??this.options,deliver:p=>this._controller?.setPointer(p)});
    this._mutation.observe(this,{attributes:true,attributeFilter:['style','class']});

    for(const name of ['options','source'])if(Object.prototype.hasOwnProperty.call(this,name)){const value=this[name];delete this[name];this[name]=value;}this._requestRefresh();
  }
  cancelLoading(){this._generation++;this._loadAbort?.abort();this._loadAbort=null;this._loadObserver?.disconnect();this._loadObserver=null;this._pendingKind=null;}
  disconnectedCallback(){
    this.removeEventListener('ft-motion',this._motionEvent);this._inputBinding?.destroy();this._inputBinding=null;this.cancelLoading();this._mutation.disconnect();
    this._dragger?.destroy();this._dragger=null;this._controller?.destroy();this._controller=null;this._kind='';this._sourceSeen=null;this._lastPointer=null;this._layer.replaceChildren();this._content.style.filter='';this._waterDefs?.remove();this._waterDefs=null;
  }
  attributeChangedCallback(name,oldValue,newValue){if(oldValue!==newValue){if(name==='loading'||name==='effect'||name==='material')this.cancelLoading();this._requestRefresh();}}
  resolveEffect(){let effect=this.constructor.effect||this.getAttribute('effect')||this.getAttribute('material')||'glass';if(surfaceNames.includes(effect))effect='surface';if(effect==='cloud')effect='clouds';return effect;}
  resolvePreset(effect){
    const given=this.getAttribute('preset')||this.getAttribute('type');
    if(effect==='surface'){const material=this.getAttribute('material')||'wood',allowed=surfaceNames.includes(material)?material:'wood',name=given?.replace(/^cartoon-/,'smooth-');return name?.includes('/')?name:`${allowed}/${name||Object.keys(PRESETS.surface).find(key=>key.startsWith(`${allowed}/`))?.split('/')[1]}`;}
    if(effect==='glass'&&given==='clear')return'liquid';return given||Object.keys(PRESETS[effect]??{})[0];
  }
  readOptions(effect){
    const schema={...COMMON_SCHEMA,...SCHEMAS[effect]};let result=getDefaults(effect,this.resolvePreset(effect));const css=getComputedStyle(this),values={};
    for(const [key,spec]of Object.entries(schema)){
      let value='';const old=aliases[effect]?.[key];if(old)value=css.getPropertyValue(old).trim();if(effect==='surface'){const wood=css.getPropertyValue(`--wood-${kebab(key)}`).trim();if(wood)value=wood;}
      const custom=css.getPropertyValue(`--ft-${kebab(key)}`).trim();if(custom)value=custom;if(value!=='')values[key]=spec.kind==='number'?parseFloat(value):value;const attr=kebab(key);if(this.hasAttribute(attr))values[key]=this.getAttribute(attr);
    }
    if(effect==='glass'){const type=this.getAttribute('type');if(type==='liquid'||type==='clear')values.variant='liquid';else if(type==='frosted')values.variant='frosted';}
    if(effect==='water'&&['floating','submerged'].includes(this.getAttribute('type')))values.contentMode=this.getAttribute('type');if(effect==='surface'&&surfaceNames.includes(this.getAttribute('material')))values.material=this.getAttribute('material');
    result=normalizeOptions(effect,values,result);return normalizeOptions(effect,this._config,result);
  }
  scheduleLoad(effect){
    if(this._pendingKind===effect)return;this.cancelLoading();this._pendingKind=effect;
    const mode=this.getAttribute('loading')||(this.hasAttribute('preload')?'eager':'visible');this._loadingStatus=`Waiting for ${mode} load`;
    const launch=()=>{this.load().catch(error=>{if(error.name!=='AbortError')emit(this,'ft-error',{effect,message:error.message});});};
    if(mode==='manual'&&!this._loadRequest)return;
    if(mode==='visible'&&!this._loadRequest&&typeof IntersectionObserver==='function'){this._loadObserver=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){this._loadObserver.disconnect();this._loadObserver=null;launch();}},{rootMargin:'180px'});this._loadObserver.observe(this);}
    else if(['idle','load','background'].includes(mode)&&!this._loadRequest){this._loadAbort=new AbortController();afterLoad({idle:mode!=='load',signal:this._loadAbort.signal}).then(launch).catch(error=>{if(error.name!=='AbortError')emit(this,'ft-error',{effect,message:error.message});});}
    else launch();
  }
  async load(){
    const effect=this.resolveEffect();this._loadRequest=true;this._loadObserver?.disconnect();this._loadObserver=null;this._loadAbort?.abort();this._loadAbort=null;const generation=this._generation;this._loadingStatus='Downloading module';
    try{await loadEffect(effect);if(generation===this._generation&&this.isConnected&&this.resolveEffect()===effect){this._pendingKind=null;this.refresh();}return this;}
    catch(error){if(generation===this._generation){this._pendingKind=null;this._loadingStatus=`Load failed: ${error.message}`;}throw error;}
  }
  refresh(){
    const effect=this.resolveEffect();if(!EFFECT_NAMES.includes(effect)){this._controller?.destroy();this._controller=null;this._kind='';this._dragger?.destroy();this._dragger=null;this._content.style.filter='';this._waterDefs?.remove();this._waterDefs=null;this._layer.replaceChildren();emit(this,'ft-error',{message:`Unknown effect: ${effect}`});return this;}
    const factory=getRenderer(effect),mode=this.getAttribute('loading');
    if(!factory||(mode==='manual'&&!this._loadRequest)){this.scheduleLoad(effect);return this;}
    const options=this.readOptions(effect);
    if(!this._controller||this._kind!==effect){this._controller?.destroy();this._layer.replaceChildren();this._content.style.filter='';this._waterDefs?.remove();this._waterDefs=null;this._kind=effect;this._sourceSeen=null;
      this._controller=createController(this,this._layer,effect,(mount,config,onState)=>{const renderer=factory(mount,config,onState);if(effect==='water'){this.makeWaterFilter();const render=renderer.render.bind(renderer);renderer.render=time=>{render(time);if(this._waterNoise&&this._controller?.options.contentMode==='submerged')this._waterNoise.setAttribute('baseFrequency',`${.012+Math.sin(time*.31)*.002} ${.02+Math.cos(time*.27)*.003}`);};}return renderer;},options);
    }else{this._controller.setOptions(options);this._controller.resize(true);}
    if(options.dragEnabled&&!this._dragger)this._dragger=makeDraggable(this,{onChange:position=>emit(this,'ft-drag',position)});else if(!options.dragEnabled&&this._dragger){this._dragger.destroy();this._dragger=null;}
    if(effect==='water'){
      this.makeWaterFilter();this._waterDisplacement.setAttribute('scale',options.contentDistortion);this._content.style.filter=options.contentMode==='submerged'&&this._controller.getStats().motionPresentation==='full'?`url(#${this._waterId})`:'';
      const source=this._source??this.getAttribute('src');if(source!==this._sourceSeen){const previous=this._sourceSeen;this._sourceSeen=source;this._controller.setSource(source).catch(error=>{if(this._sourceSeen===source)this._sourceSeen=previous;emit(this,'ft-error',{effect,message:error.message});});}
    }
    return this;
  }
  makeWaterFilter(){
    if(this._waterDefs)return;this._waterId=uid('ft-water-content');this._waterDefs=svgNode('svg',{width:0,height:0,'aria-hidden':'true'});this._waterDefs.style.position='absolute';const defs=svgNode('defs',{},this._waterDefs),filter=svgNode('filter',{id:this._waterId,x:'-20%',y:'-20%',width:'140%',height:'140%'},defs);
    this._waterNoise=svgNode('feTurbulence',{type:'fractalNoise',baseFrequency:'.012 .02',numOctaves:2,result:'water-noise'},filter);this._waterDisplacement=svgNode('feDisplacementMap',{in:'SourceGraphic',in2:'water-noise',scale:4,xChannelSelector:'R',yChannelSelector:'G'},filter);this.shadowRoot.append(this._waterDefs);
  }
  configure(options){if(!options||typeof options!=='object')throw new TypeError('configure() expects an options object.');this._config={...this._config,...options};if(this.isConnected)this.refresh();return this;}
  setOptions(options){return this.configure(options);}setPreset(name){this._config={};this.setAttribute('preset',name);if(this.isConnected)this.refresh();return this;}
  get options(){return this._controller?.options??this.readOptions(this.resolveEffect());}set options(value){this._config={...value};this._requestRefresh();}
  get source(){return this._source;}set source(value){this._source=value;this._requestRefresh();}
  get controller(){return this._controller;}getStats(){return this._controller?.getStats()??{backend:this._loadingStatus};}
  pause(){this.configure({paused:true});return this;}play(){this.configure({paused:false});return this;}step(seconds=1/60){this._config.paused=true;this._controller?.step(seconds);return this;}
  retry(){this._controller?.retry();return this;}
  resetClock(){this._controller?.resetClock();}refreshSource(){this._controller?.refreshSource();}clear(){this._controller?.clear();}burst(options){this._controller?.burst(options);return this;}resetPosition(){this._dragger?.reset();}
  async capture(target,options={}){if(this.resolveEffect()!=='water')throw new TypeError('DOM capture is available on water elements.');const generation=this._generation,revision=this._captureRevision=(this._captureRevision||0)+1,canvas=await captureDOM(target,options);if(generation===this._generation&&revision===this._captureRevision&&this.isConnected)this.source=canvas;return canvas;}
}
export function defineElements({prefix='ft',legacy=true}={}){
  if(typeof customElements==='undefined')return;if(!/^[a-z][a-z0-9-]*$/.test(prefix))throw new TypeError('The element prefix must be lowercase and begin with a letter.');
  const register=(tag,effect)=>{if(!customElements.get(tag)){class CustomEffect extends EffectElement{}CustomEffect.effect=effect;customElements.define(tag,CustomEffect);}};register(`${prefix}-effect`,'');for(const effect of EFFECT_NAMES)register(`${prefix}-${effect}`,effect);if(legacy){register('glass-box','glass');register('wood-box','surface');register('vfx-box','');register('aurora-bg','aurora');}
}
