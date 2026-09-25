/* Frontend Toolkit public demo. MIT; see LICENSE and NOTICE.txt. */
(() => {
  'use strict';
  const FT = globalThis.FrontendToolkit;
  const Model = globalThis.ToolkitSiteModel;
  const $ = id => document.getElementById(id);
  if (!FT || !Model) {
    $('effect-error').hidden = false;
    $('effect-error').textContent = 'The library could not load. Keep the extracted folder structure intact and reload.';
    return;
  }
  const state = {id:'glass',preset:'liquid',options:{},reduced:false,paused:false,code:'html'};
  const mobile = matchMedia('(max-width: 900px)');
  let element = null, revision = 0, frame = 0, pending = {}, toastTimer, diagnosticsTimer;
  const buttons = new Map();
  const categories = [...new Set(Model.catalog.map(item => Model.groups[item.effect]))];
  const inputs = new Map();
  const current = () => Model.byId.get(state.id);

  function announce(message) {
    $('announcement').textContent = message;
    $('announcement').classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('announcement').classList.remove('visible'), 3000);
  }
  function viewportLayout() { $('library').open = !mobile.matches; }
  viewportLayout();
  mobile.addEventListener('change', viewportLayout);
  function effectiveOptions() {
    return {...state.options, motion:state.reduced ? 'never' : 'always', reducedMotion:'auto', paused:state.paused,
      dragEnabled:current().effect === 'glass'};
  }
  function content(item) {
    if (['glass','glow','highlight','pattern','backdrop'].includes(item.effect) || item.effect === 'fire' && state.options.mode === 'out') {
      const box = document.createElement('div'); box.className = 'example-card';
      const label = document.createElement('span');label.className='sample-label';label.textContent='Example interface';
      const title = document.createElement('h4');title.textContent='Project overview';
      const desc = document.createElement('p');desc.textContent='Text, controls, and layout remain standard HTML.';
      const bottom = document.createElement('div');bottom.className='sample-bottom';
      const meta = document.createElement('span');meta.textContent='24 active tasks';
      const button = document.createElement('button');button.className='sample-button';button.type='button';button.textContent='View project';
      button.addEventListener('click', () => announce('Example button activated.'));
      bottom.append(meta,button);box.append(label,title,desc,bottom);return box;
    }
    if (item.effect === 'surface') {
      const label = document.createElement('span');label.className='surface-label';label.textContent=Model.pretty(state.preset);return label;
    }
    if (item.effect === 'status') {
      const label = document.createElement('span');label.className='status-label';label.textContent='Example status · visual layer';return label;
    }
    return null;
  }
  function showError(message) {
    $('effect-error').hidden=false;
    $('effect-error').textContent=message + ' Open the lab for diagnostics.';
  }
  function mount() {
    revision++;
    const item = current();
    element = document.createElement('ft-'+item.effect);
    element.className='effect-preview';
    element.setAttribute('preset',state.preset);
    element.options=effectiveOptions();
    const child=content(item);if(child)element.append(child);
    const mine=revision;
    element.addEventListener('ft-error',event=>{if(mine===revision)showError(event.detail?.message||'The renderer reported an error.');});
    for(const event of ['ft-ready','ft-motion','ft-status'])element.addEventListener(event,()=>queueMicrotask(()=>{if(mine===revision)updateStatus();}));
    $('effect-error').hidden=true;
    $('preview-mount').replaceChildren(element);
    queueMicrotask(()=>{if(mine===revision)updateStatus();});
    $('stage').dataset.family=item.effect;
    $('stage').dataset.outside=String(item.effect==='fire'&&state.options.mode==='out');
    $('interaction-hint').textContent=Model.hint(item,state.options);
    updateStatus();
  }
  function setLink() {
    // Preserve every modified setting in the advanced lab, not just the study name.
    const data={version:2,revision:7,id:state.id,preset:state.preset,config:effectiveOptions(),scene:{background:current().effect==='glass'?'photo':'dark',width:78,height:320,radius:24,content:true,fill:0}};
    $('lab-link').href='lab.html#lab='+encodeURIComponent(JSON.stringify(data));
  }
  function updateCode() {
    $('code-output').textContent=Model.snippets(current(),state.preset,state.options)[state.code];
    setLink();
  }
  function optionSpec(key) {
    const item=current();let spec={...(FT.SCHEMAS[item.effect][key]||FT.COMMON_SCHEMA[key])};
    if (spec.valuesByKind)spec.values=spec.valuesByKind[state.options.kind]||spec.values;
    if (key==='spread'&&state.options.mode==='out')spec.max=1;
    if (item.effect==='backdrop'&&key==='count')spec.max=state.options.kind==='contours'?10:state.options.kind==='waves'?12:80;
    return spec;
  }
  const shortLabel={distortion:'Refraction',tintOpacity:'Tint strength',flameSpeed:'Flame flow speed',flickerSpeed:'Flicker speed',spread:'Source width',glow:'Bloom size',speedMode:'Speed unit',velocity:'Linear speed · px/s',duration:'Lap duration · s',waveHeight:'Wave height',waveSpeed:'Wave speed',sunElevation:'Sun elevation',rainSpeed:'Fall speed · px/s',rainWind:'Wind · px/s',rainDensity:'Drop density',distanceInterval:'Spacing · CSS px',timeInterval:'Interval · ms',auroraSpeed:'Curtain speed',layers:'Detail layers',stars:'Stars',driftSpeed:'Drift speed',value:'Progress',woodCut:'Wood cut',roughness:'Surface relief',interactionStrength:'Brush strength',interactionMode:'Motion source'};
  function formatted(value,key,spec) {
    if(key==='value')return Math.round(value*100)+'%';
    return Number(Number(value).toFixed(spec.step<.01?3:spec.step<.1?2:spec.step<1?1:0)).toString();
  }
  function schedulePatch(values) {
    Object.assign(pending,values);
    if (frame) return;
    frame=requestAnimationFrame(()=>{
      frame=0;
      const patch=pending;pending={};
      state.options=FT.normalizeOptions(current().effect,patch,state.options);
      element.configure(effectiveOptions());
      $('interaction-hint').textContent=Model.hint(current(),state.options);
      if(['speedMode','throttle','trigger'].some(key=>key in patch))renderControls();
      updateCode();updateStatus();
    });
  }
  function flushPending() { if(frame)cancelAnimationFrame(frame);frame=0;pending={}; }
  function renderControls() {
    inputs.clear();
    const fragment=document.createDocumentFragment();
    for(const key of Model.controls(current(),state.options)) {
      const spec=optionSpec(key);if(!spec.kind)continue;
      const wrapper=document.createElement('div');wrapper.className='control';
      const line=document.createElement('div');line.className='control-top';
      const label=document.createElement('label');label.htmlFor='control-'+key;label.textContent=shortLabel[key]||spec.label;
      let input;const output=document.createElement('output');output.htmlFor='control-'+key;
      line.append(label);wrapper.append(line);
      if(spec.kind==='select') {
        input=document.createElement('select');
        for(const value of spec.values){const opt=document.createElement('option');opt.value=value;opt.textContent=value==='pixels'?'Pixels per second':value==='duration'?'Seconds per lap':Model.pretty(value);input.append(opt);}
        input.value=state.options[key];
        input.addEventListener('change',()=>schedulePatch({[key]:input.value}));
      } else if(spec.kind==='boolean') {
        input=document.createElement('input');input.type='checkbox';input.checked=state.options[key];
        input.addEventListener('change',()=>schedulePatch({[key]:input.checked}));
      } else if(spec.kind==='number') {
        input=document.createElement('input');input.type='range';input.min=spec.min;input.max=spec.max;input.step=spec.step;input.value=state.options[key];
        output.textContent=formatted(state.options[key],key,spec);line.append(output);
        input.addEventListener('input',()=>{output.textContent=formatted(Number(input.value),key,spec);schedulePatch({[key]:Number(input.value)});});
      } else continue;
      input.id='control-'+key;inputs.set(key,input);wrapper.append(input);fragment.append(wrapper);
    }
    $('controls').replaceChildren(fragment);
  }
  function updatePresets() {
    $('preset').replaceChildren(...Model.presets(current()).map(name=>{
      const option=document.createElement('option');option.value=name;option.textContent=Model.pretty(name);return option;
    }));
    $('preset').value=state.preset;
  }
  function select(id,{writeHash=true}={}) {
    if(!Model.byId.has(id))return;
    flushPending();
    state.id=id;state.preset=current().preset;state.options=Model.defaults(current());
    // Loading/progress compositions are centred only in this demo's square stage.
    if(current().effect==='status')state.options.anchorX=.5;
    $('selected-title').textContent=current().name;
    $('mobile-selection').textContent='Choose an effect · '+current().name;
    $('selected-family').textContent=Model.groups[current().effect].toUpperCase();
    $('element-tag').textContent='<ft-'+current().effect+'>';
    for(const [key,button] of buttons)button.setAttribute('aria-current',String(id===key));
    updatePresets();mount();renderControls();updateCode();
    if(mobile.matches)$('library').open=false;
    if(writeHash)try{history.replaceState(null,'','#effect='+encodeURIComponent(id));}catch{}
  }
  function updateMotion() {
    $('motion-full').setAttribute('aria-pressed',String(!state.reduced));
    $('motion-reduced').setAttribute('aria-pressed',String(state.reduced));
    $('pause-button').setAttribute('aria-pressed',String(state.paused));
    $('pause-button').innerHTML=state.paused?'<span aria-hidden="true">▶</span> Play':'<span aria-hidden="true">Ⅱ</span> Pause';
    $('pause-button').disabled=state.reduced;
    $('motion-note').textContent=state.reduced?'Reduced-motion preview is forced for comparison, regardless of your system preference.':'Full motion is enabled for this demo. The library respects system preferences by default.';
    if(element){element.configure(effectiveOptions());updateStatus();setLink();}
  }
  function updateStatus() {
    if(!element)return;
    const s=element.getStats();
    const backend=s.backend||'Starting';
    $('renderer-label').textContent=/fallback/i.test(backend)?'Canvas fallback':/WebGL/i.test(backend)?'WebGL':/canvas/i.test(backend)?'Canvas 2D':/svg/i.test(backend)?'SVG / CSS':/CSS/i.test(backend)?'CSS':backend;
    $('renderer-label').title=backend;
    const hidden=s.motionPresentation==='hide';
    $('presentation-note').hidden=!hidden;
    $('presentation-note').textContent='Reduced motion: decoration is hidden. Any HTML content remains available.';
  }
  function filter() {
    const term=$('search').value.trim().toLowerCase(),group=$('category').value;
    const matching=Model.catalog.filter(item=>(group==='all'||Model.groups[item.effect]===group)&&[item.name,item.effect,item.description,item.group].join(' ').toLowerCase().includes(term));
    const visible=new Set(matching.map(item=>item.id));
    for(const [id,button]of buttons)button.hidden=!visible.has(id);
    for(const label of $('effect-list').querySelectorAll('.list-group'))label.hidden=!matching.some(i=>Model.groups[i.effect]===label.dataset.group);
    $('result-count').textContent=matching.length+' of '+Model.catalog.length+' examples';
    $('no-results').hidden=matching.length!==0;
    $('clear-search').hidden=group==='all'&&!term;
  }
  for(const group of categories){const option=document.createElement('option');option.value=group;option.textContent=group;$('category').append(option);
    const label=document.createElement('span');label.className='list-group';label.dataset.group=group;label.textContent=group;$('effect-list').append(label);
    for(const item of Model.catalog.filter(i=>Model.groups[i.effect]===group)){
      const button=document.createElement('button');button.type='button';button.dataset.effect=item.id;button.setAttribute('aria-current','false');
      const name=document.createElement('span');name.textContent=item.name;const arrow=document.createElement('span');arrow.textContent='›';arrow.setAttribute('aria-hidden','true');button.append(name,arrow);button.addEventListener('click',()=>select(item.id));buttons.set(item.id,button);$('effect-list').append(button);
    }
  }
  $('search').addEventListener('input',filter);$('category').addEventListener('change',filter);
  $('clear-search').addEventListener('click',()=>{$('search').value='';$('category').value='all';filter();$('search').focus();});
  $('preset').addEventListener('change',()=>{flushPending();state.preset=$('preset').value;state.options=Model.defaults(current(),state.preset);if(current().effect==='status')state.options.anchorX=.5;mount();renderControls();updateCode();});
  $('reset-button').addEventListener('click',()=>{select(state.id);announce('Preset reset.');});
  $('motion-full').addEventListener('click',()=>{state.reduced=false;state.paused=false;updateMotion();});
  $('motion-reduced').addEventListener('click',()=>{state.reduced=true;state.paused=false;updateMotion();});
  $('pause-button').addEventListener('click',()=>{state.paused=!state.paused;updateMotion();});
  for(const button of document.querySelectorAll('[data-code]'))button.addEventListener('click',()=>{state.code=button.dataset.code;for(const b of document.querySelectorAll('[data-code]'))b.setAttribute('aria-pressed',String(b===button));updateCode();});
  $('copy-code').addEventListener('click',async()=>{
    const text=$('code-output').textContent;
    try{await navigator.clipboard.writeText(text);announce('Code copied.');}
    catch{const area=document.createElement('textarea');area.value=text;area.style.cssText='position:fixed;left:-9999px;top:0';document.body.append(area);area.select();const ok=document.execCommand('copy');area.remove();$('copy-code').focus();announce(ok?'Code copied.':'Select and copy the code manually; clipboard access is unavailable.');}
  });
  function fromHash(){const match=location.hash.match(/^#effect=([^&]+)/);if(match)try{const id=decodeURIComponent(match[1]);if(Model.byId.has(id)){select(id,{writeHash:false});return true;}}catch{}return false;}
  window.addEventListener('hashchange',fromHash);
  for(const node of document.querySelectorAll('[data-version]'))node.textContent=FT.version;
  if(!fromHash())select('glass',{writeHash:false});filter();updateMotion();
  diagnosticsTimer=setInterval(()=>{if(!document.hidden)updateStatus();},1500);
  window.addEventListener('pagehide',()=>{clearInterval(diagnosticsTimer);flushPending();});
  window.addEventListener('pageshow',event=>{if(event.persisted){clearInterval(diagnosticsTimer);diagnosticsTimer=setInterval(()=>{if(!document.hidden)updateStatus();},1500);}});
  // Small, deliberate testing surface; no analytics or automatic diagnostics upload.
  globalThis.ToolkitDemo={select,get element(){return element;},get state(){return {...state,options:{...state.options}};}};
})();
