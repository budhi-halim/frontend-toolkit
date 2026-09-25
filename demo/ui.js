(() => {
  'use strict';
  const FT=globalThis.FrontendToolkit,Lab=globalThis.ToolkitLab;
  if(!FT||!Lab)return;
  const $=id=>document.getElementById(id);
  const {state,notice}=Lab.load();
  let specimen=null,captureVersion=0,toastTimer,saveTimer,allAnimating=false,customTexture=null;
  let events=[],motionOverride=location.hash.startsWith('#lab=')?null:'always',lastProbe=null;
  if(motionOverride)for(const config of Object.values(state.configs))config.motion=motionOverride;
  FT.setDiagnostics({console:true,level:'info'});
  console.info('[frontend-toolkit] Material Lab '+FT.version,FT.environmentReport());
  const inputMap=new Map();
  const galleryEffects=new Map();
  const palette={glass:'oklch(.77 .06 195)',frosted:'oklch(.86 .012 200)',water:'oklch(.69 .11 213)',wood:'oklch(.64 .09 62)',marble:'oklch(.8 .012 80)',paper:'oklch(.88 .05 80)',wall:'oklch(.68 .027 110)',fire:'oklch(.69 .19 40)',smoke:'oklch(.63 .022 285)',clouds:'oklch(.78 .073 239)',aurora:'oklch(.71 .14 158)',glow:'oklch(.68 .14 304)'};
  function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4200);}
  function persist(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>Lab.save(state),200);}
  async function copy(text,message='Copied to clipboard.'){
    try{await navigator.clipboard.writeText(text);toast(message);}
    catch{
      const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.left='-9999px';document.body.append(area);area.select();
      const ok=document.execCommand('copy');area.remove();toast(ok?message:'Clipboard unavailable. Select and copy the code manually.');
    }
  }
  function format(value,step=.01){const digits=step<.001?4:step<.01?3:step<.1?2:step<1?1:0;return Number(value.toFixed(digits)).toString();}
  function noteEvent(event){
    if(event.target!==specimen)return;
    const detail=event.detail||{};
    const text=`${new Date().toLocaleTimeString()} · ${event.type}${detail.message?' · '+detail.message:detail.status?' · '+detail.status:''}`;
    events.unshift(text);events=events.slice(0,30);
    $('event-count').textContent=String(events.length);$('event-log').replaceChildren(...events.map(value=>{const li=document.createElement('li');li.textContent=value;return li;}));
    if(event.type==='ft-error'){toast(detail.message||'Renderer error. Check the event log.');$('event-details').open=true;}
    updateStats();
  }
  function createSpecimen(item,{thumbnail=false}={}){
    const element=document.createElement(`ft-${item.effect}`);element.className='specimen';element.dataset.kind=item.id;
    element.setAttribute('preset',item.preset);
    element.options=thumbnail?{...Lab.defaults(item.id),...(item.effect==='trail'?{trigger:'auto',autoEmit:false}:{}),...(item.effect==='highlight'?{activation:'auto',motionSource:'auto',idleIntensity:.7}:{}),...(item.effect==='status'?{anchorX:.5}:{}),interactive:false,dragEnabled:false,paused:true,quality:.4,dprCap:1,fps:24}:{...state.configs[item.id]};
    if(!thumbnail){
      const content=document.createElement('div');content.className='specimen-content';
      const kicker=document.createElement('p');kicker.className='kicker';kicker.textContent=`${item.label} / ${item.badge}`;
      const title=document.createElement('h3');title.textContent=item.word;
      const bottom=document.createElement('div');bottom.className='content-bottom';
      const label=document.createElement('span');label.textContent='EXAMPLE HTML CONTENT';
      const button=document.createElement('button');button.className='content-action';button.type='button';button.textContent='↗';button.setAttribute('aria-label','Test the live HTML button');
      button.addEventListener('click',()=>toast('Button activated. The content remains standard HTML.'));
      bottom.append(label,button);content.append(kicker,title,bottom);element.append(content);
      for(const name of ['ft-ready','ft-status','ft-error','ft-disposed'])element.addEventListener(name,noteEvent);
    }
    return element;
  }
  function renderNav(){
    $('effect-nav').replaceChildren(...Lab.CATALOG.map(item=>{
      const button=document.createElement('button');button.type='button';button.dataset.id=item.id;button.setAttribute('aria-current',String(item.id===state.current));
      const dot=document.createElement('span');dot.className='nav-dot';dot.style.setProperty('--dot',palette[item.id]||palette[item.effect]||'oklch(.72 .08 190)');dot.setAttribute('aria-hidden','true');button.append(dot,document.createTextNode(item.name));
      button.addEventListener('click',()=>select(item.id));return button;
    }));
  }
  function filterCatalog(){
    const words=$('effect-search').value.trim().toLowerCase().split(/\s+/).filter(Boolean),group=$('effect-group').value;let count=0;
    const visible=new Set(Lab.CATALOG.filter(item=>{const text=[item.id,item.name,item.group,item.effect,item.description].join(' ').toLowerCase();return(group==='all'||item.group===group)&&words.every(word=>text.includes(word));}).map(item=>item.id));
    for(const button of $('effect-nav').children){button.hidden=!visible.has(button.dataset.id);if(!button.hidden)count++;}
    for(const tile of $('gallery').children)tile.hidden=!visible.has(tile.dataset.id);
    $('filter-summary').textContent=count+' / '+Lab.CATALOG.length+' effects';$('study-count').textContent=count===Lab.CATALOG.length?count+' STUDIES':count+' OF '+Lab.CATALOG.length+' STUDIES';
  }
  function renderGallery(){
    const fragment=document.createDocumentFragment();
    for(const item of Lab.CATALOG){
      const tile=document.createElement('button');tile.type='button';tile.className='tile';tile.dataset.id=item.id;tile.setAttribute('aria-label',`Inspect ${item.name}`);
      const visual=document.createElement('div');visual.className='tile-visual';
      const effect=createSpecimen(item,{thumbnail:true});galleryEffects.set(item.id,effect);
      const mark=document.createElement('span');mark.className='tile-mark';mark.textContent=item.label+' / '+item.group.toUpperCase();
      const arrow=document.createElement('span');arrow.className='tile-view';arrow.textContent='↗';arrow.setAttribute('aria-hidden','true');
      visual.append(effect,mark,arrow);
      const meta=document.createElement('div');meta.className='tile-meta';
      const name=document.createElement('span');name.className='tile-name';name.textContent=item.name;
      const group=document.createElement('span');group.className='tile-group';group.textContent=item.group;
      meta.append(name,group);tile.append(visual,meta);
      tile.addEventListener('click',()=>{select(item.id);$('workspace').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});});
      const play=()=>effect.configure({paused:false});const pause=()=>{if(!allAnimating)effect.configure({paused:true});};
      tile.addEventListener('pointerenter',play);tile.addEventListener('pointerleave',pause);tile.addEventListener('focus',play);tile.addEventListener('blur',pause);
      fragment.append(tile);
    }
    $('gallery').append(fragment);
  }
  function select(id){
    if(!Lab.lookup(id))return;
    state.current=id;const item=Lab.lookup(id);
    $('selected-title').textContent=item.name;$('selected-index').textContent=item.label;$('effect-type').textContent=item.group;$('selected-description').textContent=item.description;
    $('stage').dataset.effect=id;$('stage').dataset.family=item.effect;captureVersion++;
    for(const button of $('effect-nav').children)button.setAttribute('aria-current',String(button.dataset.id===id));
    for(const tile of $('gallery').children)tile.classList.toggle('selected',tile.dataset.id===id);
    if(motionOverride!==null)state.configs[id].motion=motionOverride;
    const next=createSpecimen(item);specimen=next;$('specimen-mount').replaceChildren(next);
    if(item.effect==='water'&&customTexture)next.source=customTexture;
    renderControls();updateScene();renderCode();updateStats();persist();
  }
  function applyPatch(patch){Lab.patch(state,patch);specimen.configure(state.configs[state.current]);updateScene();renderCode();updateTransport();if(['activation','motionSource','indeterminate','shadowKind','skeletonLayout','shimmer','fade','speedMode','palette','mode','model','respectGravity','trigger','kind','colorMode','variantMode','material','throttle','interactionMode','interactionTrigger','strikeTrigger','interactive','transparent'].some(key=>key in patch))renderControls();persist();}
  function control(key,spec){
    if(spec.valuesByKind)spec={...spec,values:spec.valuesByKind[state.configs[state.current].kind]||spec.values};
    const fx=Lab.lookup(state.current).effect,o=state.configs[state.current];
    if(fx==='fire'&&key==='spread'&&o.mode==='out')spec={...spec,max:1};
    if(fx==='fire'&&key==='direction'&&o.mode==='in')spec={...spec,values:spec.values.filter(value=>value!=='outward')};
    if(fx==='backdrop'&&key==='count')spec={...spec,max:o.kind==='contours'?10:o.kind==='waves'?12:80};
    if(Lab.lookup(state.current).effect==='field'&&state.configs[state.current].kind==='rain'&&key==='color2')spec={...spec,label:'Drop color'};
    const value=state.configs[state.current][key];const id=`option-${key}`;
    const wrapper=document.createElement('div');wrapper.className='control';wrapper.dataset.option=key;
    if(spec.kind==='boolean'){
      const label=document.createElement('label');label.className='boolean-control';label.htmlFor=id;
      const input=document.createElement('input');input.type='checkbox';input.id=id;input.checked=value;
      input.addEventListener('change',()=>applyPatch({[key]:input.checked}));label.append(input,document.createTextNode(spec.label));wrapper.append(label);inputMap.set(key,input);return wrapper;
    }
    const line=document.createElement('div');line.className='control-line';const label=document.createElement('label');label.htmlFor=id;label.textContent=spec.label;line.append(label);wrapper.append(line);
    if(spec.kind==='number'){
      const numeric=document.createElement('input');numeric.type='number';numeric.min=spec.min;numeric.max=spec.max;numeric.step=spec.step;numeric.value=format(value,spec.step);numeric.setAttribute('aria-label',`${spec.label}, numeric value`);
      const slider=document.createElement('input');slider.type='range';slider.id=id;
      const logarithmic=['grainX','grainY','frosting'].includes(key);
      const fromSlider=value=>logarithmic?Math.exp(Math.log(spec.min)+(Math.log(spec.max)-Math.log(spec.min))*Number(value)/1000):Number(value);
      const toSlider=value=>logarithmic?1000*(Math.log(value)-Math.log(spec.min))/(Math.log(spec.max)-Math.log(spec.min)):value;
      slider.min=logarithmic?0:spec.min;slider.max=logarithmic?1000:spec.max;slider.step=logarithmic?1:spec.step;slider.value=toSlider(value);slider.setAttribute('aria-valuetext',String(value));
      const update=v=>{
        const value=Math.min(spec.max,Math.max(spec.min,Math.round(v/spec.step)*spec.step));
        slider.value=toSlider(value);numeric.value=format(value,spec.step);slider.setAttribute('aria-valuetext',format(value,spec.step));applyPatch({[key]:value});
      };
      slider.addEventListener('input',()=>update(fromSlider(slider.value)));
      numeric.addEventListener('change',()=>update(Number.isFinite(numeric.valueAsNumber)?numeric.valueAsNumber:spec.default));
      line.append(numeric);wrapper.append(slider);inputMap.set(key,{slider,numeric});
    }else if(spec.kind==='select'){
      const select=document.createElement('select');select.id=id;
      for(const value of spec.values){const option=document.createElement('option');option.value=value;option.textContent=value.replaceAll('-',' ');select.append(option);}
      select.value=value;select.addEventListener('change',()=>applyPatch({[key]:select.value}));wrapper.append(select);inputMap.set(key,select);
    }else if(spec.kind==='color'){
      const row=document.createElement('div');row.className='color-control';
      const swatch=document.createElement('input');swatch.type='color';swatch.setAttribute('aria-label',`${spec.label}, color picker`);
      const text=document.createElement('input');text.type='text';text.id=id;text.value=value;text.spellcheck=false;
      const toHex=css=>{const canvas=document.createElement('canvas');canvas.width=1;canvas.height=1;const ctx=canvas.getContext('2d');ctx.fillStyle=css;ctx.fillRect(0,0,1,1);return '#'+[...ctx.getImageData(0,0,1,1).data].slice(0,3).map(n=>n.toString(16).padStart(2,'0')).join('');};
      swatch.value=toHex(value);
      text.addEventListener('change',()=>{if(!CSS.supports('color',text.value)){text.setCustomValidity('Enter a valid CSS color.');text.reportValidity();return;}text.setCustomValidity('');applyPatch({[key]:text.value});swatch.value=toHex(text.value);});
      text.addEventListener('input',()=>text.setCustomValidity(''));
      swatch.addEventListener('input',()=>{text.value=swatch.value;applyPatch({[key]:swatch.value});});row.append(swatch,text);wrapper.append(row);
    }
    return wrapper;
  }
  function renderControls(){
    inputMap.clear();const item=Lab.lookup(state.current);
    $('effect-controls').replaceChildren(...Object.entries(FT.SCHEMAS[item.effect]).filter(([key,spec])=>{if(key==='material')return false;
      const o=state.configs[state.current];
      if(spec.kinds&&!spec.kinds.includes(o.kind))return false;
      if(item.effect==='status'&&['avatarSize','avatarGap'].includes(key)&&o.skeletonLayout!=='avatar')return false;
      if(['highlight','backdrop','pattern','status'].includes(item.effect)&&['forceFallback','fallbackAnimation','fallbackFPS','fallbackResolution'].includes(key))return false;
      if(item.effect==='status'&&!['dots','equalizer'].includes(o.kind)&&!o.indeterminate&&!o.shimmer&&['cycle','reverse'].includes(key))return false;
      if(item.effect==='highlight'&&o.activation!=='auto'&&key==='interval')return false;
      if(item.effect==='status'&&key==='value'&&o.indeterminate)return false;
      if(item.effect==='status'&&['cycle','reverse'].includes(key)&&(['ring','bar','segments'].includes(o.kind)?!o.indeterminate:o.kind==='skeleton'?!o.shimmer:o.amplitude===0))return false;
      if(item.effect==='pattern'&&key==='fadeStrength'&&o.fade==='none')return false;
      if(item.effect==='glow'&&['color','color2','color3'].includes(key)&&o.palette!=='custom')return false;
      if(item.effect==='glow'){if(key==='duration')return o.speedMode==='duration';if(key==='velocity')return o.speedMode==='pixels';}
      if(item.effect==='fire'){if(['blueBase','embers','filament'].includes(key)&&o.mode==='out')return false;if(key==='filament'&&o.model!=='ribbon')return false;if(key==='blueBase'&&!['ribbon','candle'].includes(o.model))return false;if(['outPolicy','sourceEdge','reach'].includes(key))return o.mode==='out';if(key==='gravity')return o.respectGravity;}
      if(item.effect==='trail'){
        if(['autoEmit','rainbow','emission'].includes(key))return false;
        if(key==='variant')return o.variantMode==='fixed';if(key==='mix')return o.kind==='mixed';
        if(key==='burstCount')return ['manual','click'].includes(o.trigger);
        if(['throttle','distanceInterval','timeInterval'].includes(key)&&['click','manual'].includes(o.trigger))return false;
        if(key==='distanceInterval')return o.throttle==='distance';if(key==='timeInterval')return o.throttle==='time';
        if(['color3','color4'].includes(key))return o.colorMode==='palette';
      }
      if(item.effect==='field'){
        if(key.startsWith('rain'))return o.kind==='rain';
        if(key==='oceanAmplitude')return o.kind==='ocean';
        if(['interactive','interactionMode'].includes(key))return o.kind==='magnetic';
        if(o.kind==='rain'&&key==='color')return !o.transparent;
        if(o.kind==='rain'&&['scale','detail','warp','brightness','color3','wind'].includes(key))return false;
      }
      if(item.effect==='sea'&&key==='interactive')return false;
      if(item.effect==='art'){
        if(['interactive','interactionMode'].includes(key))return ['metaballs','interference'].includes(o.kind);
        if(['interactionTrigger','interactionAction','interactionRadius','interactionStrength','viscosity'].includes(key))return o.kind==='metaballs'&&(key==='viscosity'||o.interactive&&o.interactionMode!=='auto');
      }
      if(item.effect==='sketch'){
        if(['interactive','interactionMode'].includes(key))return ['constellation','blobs'].includes(o.kind);
        if(key==='linkDistance')return o.kind==='constellation';
        if(['branches','strikeInterval','strikeTrigger','jaggedness','branchSpread','branchLength','tortuosity','taper','strikeDuration','strikeOriginX','strikeOriginY','strikeTargetX','strikeTargetY','strikeWander'].includes(key))return o.kind==='lightning'&&(key!=='strikeInterval'||['auto','both'].includes(o.strikeTrigger));
        if(o.kind==='lightning'&&['count','complexity','amplitude','drift'].includes(key))return false;
      }
      if(item.effect!=='surface')return true;const material=state.configs[state.current].material;const relevance={fibers:['wood','paper'],weathering:['wood','paper','wall'],woodSpecies:['wood'],woodCut:['wood'],woodFinish:['wood'],ringScale:['wood'],pores:['wood'],knots:['wood'],paperKind:['paper'],marbleKind:['marble'],depth:['wood','marble'],orientation:['wood'],detail:['wood','marble','paper','wall','sand','slate','granite']};return !relevance[key]||relevance[key].includes(material);}).map(([key,spec])=>control(key,spec)));
    $('performance-controls').replaceChildren(...Object.entries(FT.COMMON_SCHEMA).filter(([key])=>!['seed','paused','dragEnabled'].includes(key)&&(!['highlight','backdrop','pattern','status'].includes(item.effect)||!['forceFallback','fallbackAnimation','fallbackFPS','fallbackResolution'].includes(key))).map(([key,spec])=>control(key,spec)));const performanceHelp=document.createElement('p');performanceHelp.className='control-help';performanceHelp.textContent='Automatic quality is shared across visible effects. Offscreen release preserves options and clock, but fluid state restarts; use 0 to keep it. Fallback rendering is intentionally simpler. Reduced-motion auto chooses a calm or absent effect instead of frozen flames; subtle explicitly permits slower motion.';$('performance-controls').append(performanceHelp);
    $('preset-select').replaceChildren();
    const groups=new Map();
    for(const key of Object.keys(FT.PRESETS[item.effect]).sort((a,b)=>a.localeCompare(b))){
      if(item.effect==='fire'&&key==='classic-hearth')continue;
      const option=document.createElement('option');option.value=key;option.textContent=key.split('/').at(-1).replaceAll('-',' ');
      if(key.includes('/')){
        const groupName=key.split('/')[0];if(!groups.has(groupName)){const group=document.createElement('optgroup');group.label=groupName;groups.set(groupName,group);$('preset-select').append(group);}groups.get(groupName).append(option);
      }else $('preset-select').append(option);
    }
    $('preset-select').value=FT.canonicalPreset(item.effect,state.presets[state.current]);$('seed-input').value=state.configs[state.current].seed;
    $('source-details').hidden=item.effect!=='water';
    if(item.effect==='surface'&&state.configs[state.current].material==='wood'){const help=document.createElement('p');help.className='control-help';help.textContent='Anatomy changes the grain itself. Plain-sawn exposes cathedral figure; quarter-sawn exposes parallel grain and rays. End grain cuts across the growth shells. Smooth, charred and weathered are finishes, not species.';$('effect-controls').append(help);}
    if(item.effect==='glow'){const help=document.createElement('p');help.className='control-help';help.textContent='For transparency: set Card fill to 0% and Bloom placement to outside. Use the Transparency backdrop to check the hole. For constant linear motion: select pixels, then set Linear speed in CSS px/s. Inside confines the bloom to the inner aperture; both allows both sides. Duration keeps time per lap; pixels keeps CSS travel speed as the shape resizes. Trail length works with every palette. To edit individual colors, select the custom palette.';$('effect-controls').append(help);}
    if(item.effect==='trail'){
      const help=document.createElement('p');help.className='control-help';help.textContent='Distance places particles at even CSS-pixel intervals along your stroke, independent of event and frame rates. Time uses milliseconds between samples. Hover / Press keep emitting at a stationary pointer only in Time mode. Both combines an automatic brush and pointer strokes. Exit, cancellation and pause end a stroke. Click and Manual use explicit bursts; existing particles finish their lifetime.';$('effect-controls').append(help);
      const burst=document.createElement('button');burst.type='button';burst.className='text-button';burst.textContent='Emit one test burst';burst.addEventListener('click',()=>specimen.burst({x:.5,y:.5,count:state.configs[state.current].burstCount}));$('effect-controls').append(burst);
    }
    const extraHelp={
      rain:'Layered Canvas rain on all devices. Fall speed and crosswind are CSS px/s; depth controls how far drops are scaled down. Streaks follow each drop’s actual velocity, and faster drops make longer blur streaks at the same exposure. Rain density is bounded by the adaptive budget.',
      sea:'Crests and troughs travel through the surface. Wave height controls displacement; Phase speed controls wave travel (0 stops it). Direction rotates the wave field, not the camera. Calm keeps low swell; Glassy and reduced-motion Calm use a flat surface.',
      metaballs:'Stir applies a local impulse to every nearby surface, not just one selected blob. Brush radius is in CSS pixels. Pointer mode rests until you interact, Auto ignores the pointer, and Both combines the two. Press mode requires a held mouse / touch contact. Viscosity controls damping; Attraction is an optional local brush.',
      lightning:'Irregular leader and branch paths are generated per strike, with a narrow core and fading tapered branches. Click targets a discharge toward that location. Auto, Click, Both and Manual are separate triggers. There is no fullscreen flash; reduced motion suppresses lightning by default.'
    };
    if(extraHelp[item.id]){const help=document.createElement('p');help.className='control-help';help.textContent=extraHelp[item.id];$('effect-controls').append(help);}
    if(item.effect==='sketch'&&state.configs[state.current].kind==='lightning'){
      const button=document.createElement('button');button.type='button';button.className='text-button';button.textContent='Trigger one test strike';button.addEventListener('click',()=>specimen.burst({x:.58,y:.12}));$('effect-controls').append(button);
    }
    if(item.effect==='fire'){const help=document.createElement('p');help.className='control-help';help.textContent='Source selects the burning edges; direction steers their emissions. Strict clips all light inside the card; border keeps it wherever the plume travels. Disabling gravity removes the upward bend (wind and turbulence are separate). Flame flow speed moves the material; Flicker speed changes the source flicker independently. Source width selects a centered portion of each burning edge; 1 covers the edge. Source center shifts it along the edge. Width applies to all edges too.';$('effect-controls').append(help);}
    const utilityHelp={
      highlight:'Local light and feedback without moving your content. Hover, press, click, keyboard focus, automatic and manual triggers are independent of real button behavior. Manual pulses: element.burst({x:.5,y:.5}). Coordinates are normalized, Y is measured from the bottom. Resting intensity keeps a gentle finish between interactions. Reduced motion suppresses ripple, sweep and sparkle by default.',
      backdrop:'Purpose-built page backgrounds and dividers. Grain and bokeh sprites are cached; the renderer has a bounded resolution. Drift speed 0 stops the animation. Transparent base is useful for overlays. Shadows are painted illustrations, not real shadows cast onto arbitrary page content.',
      pattern:'Static by default: no continuous animation loop. Explicit drift values opt in to movement. Cell spacing is in CSS pixels. Fade affects the pattern ink, not an opaque base. Seed changes the tiled construction. Extremely large surfaces use a bounded pixel budget.',
      status:'The application controls real progress. Value is 0–1; indeterminate is separate. Place graphics with Center X/Y. These are decorative renderers: use native status text and appropriate accessible semantics on your real control. Equalizer is an abstract animation, not a microphone or audio analyser.'
    };
    if(utilityHelp[item.effect]){const help=document.createElement('p');help.className='control-help';help.textContent=utilityHelp[item.effect];$('effect-controls').prepend(help);}
    if(item.effect==='highlight'){const button=document.createElement('button');button.type='button';button.className='text-button';button.textContent='Trigger one light / feedback pulse';button.addEventListener('click',()=>specimen.burst({x:.5,y:.5}));$('effect-controls').append(button);}
    updateTransport();
  }
  function updateScene(){
    const scene=state.scene,config=state.configs[state.current];$('stage').dataset.background=scene.background;$('background-select').value=scene.background;
    const outside=Lab.lookup(state.current).effect==='fire'&&config.mode==='out';
    const padding=outside?Math.min(190,config.reach+35):60;
    $('specimen-mount').style.width='100%';$('specimen-mount').style.height=`${scene.height+padding*2}px`;
    specimen.style.width=`${scene.width}%`;specimen.style.height=`${scene.height}px`;
    specimen.style.backgroundColor=`oklch(.15 .012 240 / ${scene.fill||0})`;
    $('drag-toggle').checked=config.dragEnabled;$('fill-slider').value=scene.fill||0;$('fill-output').value=Math.round((scene.fill||0)*100)+'%';
    const family=Lab.lookup(state.current).effect;
    const interactive=(family==='trail'&&!['auto','manual'].includes(config.trigger)||family==='fluid'||family==='smoke'||family==='field'&&config.kind==='magnetic'||family==='art'&&['metaballs','interference'].includes(config.kind)||family==='sketch'&&['constellation','blobs'].includes(config.kind))&&config.interactive!==false&&config.interactionMode!=='auto';
    const clickStrike=family==='sketch'&&config.kind==='lightning'&&['click','both'].includes(config.strikeTrigger);
    $('interaction-hint').textContent=config.dragEnabled?'Drag the card · Arrow keys move it · Home resets it':clickStrike?'Click inside to target a discharge.':interactive?(config.interactionTrigger==='press'||config.trigger==='press'?'Hold and drag inside the effect to interact.':config.trigger==='click'?'Click inside to emit a burst.':'Move inside the effect to interact locally.'):family==='trail'&&config.trigger==='manual'?'Use the test burst button or call element.burst().':'Autonomous composition · no pointer-driven camera movement.';
    // Only the demonstration’s actual gesture canvas opts out of page panning.
    // The reusable custom element leaves native touch scrolling to its integrator.
    specimen.style.touchAction=interactive||config.dragEnabled?'none':'auto';
    specimen.style.borderRadius=`${scene.radius}px`;
    const content=specimen.querySelector('.specimen-content');if(content)content.hidden=!scene.content;
    $('content-toggle').checked=scene.content;
    for(const [key,unit]of [['width','%'],['height','px'],['radius','px']]){$(`scene-${key}`).value=scene[key];$(`${key}-output`).value=scene[key]+unit;}
    specimen.controller?.resize(true);renderCode();persist();
  }
  function renderCode(){
    $('code-output').textContent=Lab.snippet(state,state.codeTab);
    for(const tab of document.querySelectorAll('.code-tab')){const active=tab.dataset.tab===state.codeTab;tab.classList.toggle('active',active);tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;}
  }
  function updateTransport(){
    const paused=state.configs[state.current].paused;$('play-button').textContent=paused?'▶ Play':'Ⅱ Pause';$('play-button').setAttribute('aria-pressed',String(paused));
  }
  function updateStats(){
    if(!specimen)return;
    const stats=specimen.getStats();const config=state.configs[state.current];
    $('renderer-pill').textContent=stats.backend||'Waiting';$('time-readout').textContent=`${(stats.time||0).toFixed(2)} s`;
    $('animation-dot').classList.toggle('active',Boolean(stats.animating));
    if(stats.cssSize)$('stage-size').textContent=stats.cssSize.join(' × ')+' CSS PX';
    const mode=stats.animationState||'Initializing';
    updateRuntime(stats,config);
    const adaptive=FT.schedulerStats().adaptive;
    const rows={'Renderer':stats.backend||'Waiting','State':mode,'Canvas pixels':stats.pixels?stats.pixels.join(' × '):'Not applicable','Draw submissions':stats.frames||0,'JS submit cost':`${(stats.submitMs||0).toFixed(2)} ms`,'Shared frame jobs':FT.schedulerStats().jobs,'Frame-rate cap':`${stats.effectiveFPS||config.fps} Hz`,'Effect render rate':`${(stats.renderFPS||0).toFixed(1)} FPS`,'Motion policy':`${config.motion} · system ${stats.reducedMotion?'reduced':'normal'}`,'Auto quality':config.adaptive?(stats.qualityLevel||adaptive?.name||'Full'):'Manual','Observed frame rate':adaptive?.measuredFPS?`${adaptive.measuredFPS.toFixed(1)} FPS`:'Warming up'};
    for(const [key,label]of Object.entries({simulationGrid:'Simulation grid',pressureIterations:'Pressure passes',volumeSamples:'Volume samples',effectiveLayers:'Curtain layers',effectiveDetail:'Detail fraction',perimeterPixels:'Perimeter (CSS px)',linearSpeed:'Speed (CSS px/s)',particleCount:'Live falling particles',fallSpeed:'Fall speed (CSS px/s)',particleBudget:'Falling particle budget',spriteBuilds:'Sprite cache builds',particles:'Live particles',pending:'Texture pending',motionPresentation:'Motion presentation',sourceEdges:'Fire source',fireVisibility:'Fire visibility',gravityEnabled:'Buoyancy enabled',trigger:'Particle trigger',spawned:'Particles emitted',spriteCount:'Cached sprites',liveVariants:'Live shape variants',liveColors:'Live palette colors',liveShapes:'Live shape types',waveOctaves:'Wave detail',throttle:'Trail throttle',distanceInterval:'Spacing (CSS px)',timeInterval:'Interval (ms)',droppedSamples:'Samples skipped by cap',rainSpeed:'Rain speed (CSS px/s)',rainWind:'Crosswind (CSS px/s)',drops:'Live raindrops',affectedBodies:'Surfaces reached by brush',kineticEnergy:'Interaction energy',motionSource:'Motion source',lightningVertices:'Discharge vertices',flameSpeed:'Flame flow multiplier',flickerSpeed:'Flicker multiplier',sourceWidth:'Source width fraction',sourceOffset:'Emitter center',pulses:'Active pulses',geometryBuilds:'Geometry cache builds',tileBuilds:'Pattern tile builds',paintBuilds:'Pattern paint builds',cachedApertures:'Cached apertures'}))if(stats[key]!==undefined)rows[label]=stats[key];
    $('stats-list').replaceChildren(...Object.entries(rows).flatMap(([key,value])=>{const dt=document.createElement('dt');dt.textContent=key;const dd=document.createElement('dd');dd.textContent=String(value);return[dt,dd];}));
    $('backend-note').textContent=(stats.reason?stats.reason+' ':'')+(stats.fidelity?stats.fidelity+'. ':'')+'Submit cost includes CPU fallback work, but not GPU execution time. Observed frame rate is shared RAF cadence; Effect render rate counts this element’s renders.';
    const fallback=/fallback/.test(stats.backend||''),blocked=['reduced-motion','render-error','initialization-error'].includes(mode);$('health-label').textContent=blocked?'STOPPED':fallback?'FALLBACK':'READY';$('health-label').classList.toggle('warning',fallback||blocked);
  }
  function updateRuntime(stats,config){
    $('lab-motion-full').setAttribute('aria-pressed',String(config.motion==='always'));
    $('lab-motion-reduced').setAttribute('aria-pressed',String(config.motion==='never'));
    const blocked=stats.animationState==='reduced-motion',fallback=/fallback/.test(stats.backend||''),failed=/error$/.test(stats.animationState||'');
    let label=stats.animating?'Animation is running':stats.animationReason||'Preparing renderer';
    let detail=stats.reason||'The effect runs locally in this browser. No rendered frames are streamed from the host PC.';
    if(blocked){label=`Reduced-motion presentation: ${stats.motionPresentation||'still'}`;detail='Auto shows calm, undistorted water and a flat sea; suppresses fire, rain, fluid and trails; and keeps suitable still compositions. Content remains usable. Subtle motion is a developer-selected opt-in, not the default. Enable animations for testing only as an explicit choice.';}
    else if(failed){label='The renderer reported an error';detail=(stats.error||stats.animationReason)+' Run diagnostics, save the report, then try Retry renderer.';}
    else if(fallback){label=stats.animating?'Animated portable fallback':'Portable fallback · '+(stats.animationState||'starting');detail='WebGL is unavailable or portable mode was selected. This is a lighter Canvas approximation, not the full shader. '+(config.fallbackAnimation==='static'?'Portable motion is explicitly set to static.':'');}
    else if(config.paused)detail='Press Play to resume. Step +1 advances one frame while keeping the effect paused.';
    $('runtime-label').textContent=label;$('runtime-detail').textContent=detail;$('runtime-indicator').classList.toggle('active',Boolean(stats.animating));
    $('runtime-label').parentElement.parentElement.classList.toggle('attention',blocked||failed);
    $('enable-motion').hidden=!blocked;$('respect-motion').hidden=config.motion!=='always';
    const item=Lab.lookup(state.current),gpu=['water','fire','smoke','clouds','aurora','field','fluid','sea','art'].includes(item.effect)&&!(item.effect==='field'&&config.kind==='rain');
    $('portable-button').hidden=!gpu;$('portable-button').textContent=config.forceFallback?'Try WebGL again':'Use Canvas fallback';
  }
  function setMotionPolicy(policy){
    motionOverride=policy;
    for(const config of Object.values(state.configs))config.motion=policy;
    for(const effect of galleryEffects.values())effect.configure({motion:policy});
    applyPatch({motion:policy,paused:false,speed:state.configs[state.current].speed||1});renderControls();updateStats();
    toast(policy==='always'?'Full motion preview enabled. Your system setting is unchanged.':policy==='never'?'Reduced-motion alternatives enabled.':'Using your system motion preference.');
  }
  function debugReport({probe=false}={}){
    if(probe||!lastProbe)lastProbe=FT.probeWebGL();
    return{toolkit:FT.version,environment:FT.environmentReport(),webgl:lastProbe,configuration:Lab.serialize(state),stats:specimen.getStats(),scheduler:FT.schedulerStats(),diagnostics:FT.getDiagnostics(),events};
  }
  function runDiagnostics(){
    const report=debugReport({probe:true});console.group('[frontend-toolkit] Diagnostic report '+FT.version);console.log(report);console.groupEnd();
    const gl=report.webgl;$('probe-result').hidden=false;$('probe-result').textContent=(gl.rendering?'WebGL draw/readback passed. ':gl.reason+' ')+(report.environment.secureContext?'Secure context.':'WebGPU requires a secure context; these WebGL/Canvas effects do not.')+' Save the debug report to compare computers.';
    toast('Diagnostics collected locally. Open the console or save the report.');return report;
  }
  function saveReport(){
    const blob=new Blob([JSON.stringify(debugReport(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download='frontend-toolkit-debug-report.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function downloadConfiguration(){
    const blob=new Blob([JSON.stringify(Lab.serialize(state),null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=`ft-${state.current}-settings.json`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Configuration exported.');
  }
  // === CONTROLS AND COMMANDS ===
  $('preset-select').addEventListener('change',event=>{Lab.preset(state,event.target.value);if(motionOverride!==null)state.configs[state.current].motion=motionOverride;specimen.options={...state.configs[state.current]};updateScene();renderControls();renderCode();persist();});
  $('reset-button').addEventListener('click',()=>{const item=Lab.lookup(state.current);Lab.preset(state,item.preset);if(motionOverride!==null)state.configs[state.current].motion=motionOverride;specimen.options={...state.configs[state.current]};specimen.resetClock();specimen.resetPosition();updateScene();renderControls();renderCode();persist();toast(`${item.name} reset to its starting preset.`);});
  $('play-button').addEventListener('click',()=>applyPatch({paused:!state.configs[state.current].paused}));
  $('step-button').addEventListener('click',()=>{applyPatch({paused:true});specimen.step();updateStats();});
  $('rewind-button').addEventListener('click',()=>{specimen.resetClock();updateStats();});
  $('seed-input').addEventListener('change',()=>{applyPatch({seed:$('seed-input').value});$('seed-input').value=state.configs[state.current].seed;});
  $('random-seed').addEventListener('click',()=>{const seed=crypto.getRandomValues(new Uint32Array(1))[0]%65536;applyPatch({seed});$('seed-input').value=seed;});
  $('background-select').addEventListener('change',event=>{state.scene.background=event.target.value;updateScene();});
  $('drag-toggle').addEventListener('change',event=>applyPatch({dragEnabled:event.target.checked}));
  $('reset-position').addEventListener('click',()=>specimen.resetPosition());
  $('clear-effect').addEventListener('click',()=>{specimen.clear();toast('Particle / fluid state cleared.');});
  $('fill-slider').addEventListener('input',event=>{state.scene.fill=Number(event.target.value);updateScene();});
  $('frame-effect').addEventListener('click',()=>{const outside=Lab.lookup(state.current).effect==='fire'&&state.configs[state.current].mode==='out';state.scene.width=outside?42:72;state.scene.height=outside?170:290;specimen.resetPosition();updateScene();});
  $('capture-button').addEventListener('click',async()=>{const version=++captureVersion,button=$('capture-button');button.disabled=true;try{const canvas=await FT.captureDOM($('snapshot-sample'),{scale:1});if(version===captureVersion&&state.current==='water'){customTexture=canvas;specimen.source=canvas;$('texture-name').textContent=`HTML snapshot · ${canvas.width} × ${canvas.height}`;toast('Captured the isolated clone. The original styles were not changed.');}}catch(error){toast('Snapshot: '+error.message);}finally{button.disabled=false;}});
  $('content-toggle').addEventListener('change',event=>{state.scene.content=event.target.checked;updateScene();});
  for(const key of ['width','height','radius'])$(`scene-${key}`).addEventListener('input',event=>{state.scene[key]=Number(event.target.value);updateScene();});
  const tabs=[...document.querySelectorAll('.code-tab')];
  for(const tab of tabs){
    tab.addEventListener('click',()=>{state.codeTab=tab.dataset.tab;renderCode();});
    tab.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const current=tabs.indexOf(tab);const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(current+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[next].click();tabs[next].focus();});
  }
  $('copy-button').addEventListener('click',()=>copy(Lab.snippet(state,state.codeTab),'Integration code copied.'));
  $('share-button').addEventListener('click',()=>{const url=location.href.split('#')[0]+'#lab='+encodeURIComponent(JSON.stringify(Lab.serialize(state)));copy(url,location.protocol==='file:'?'Local scene link copied. It requires the same file location; export JSON for another computer.':'Scene link copied.');});
  $('copy-report').addEventListener('click',()=>copy(JSON.stringify(debugReport(),null,2),'Debug report copied.'));
  $('download-report').addEventListener('click',saveReport);
  $('diagnose-button').addEventListener('click',runDiagnostics);
  $('enable-motion').addEventListener('click',()=>setMotionPolicy('always'));
  $('lab-motion-full').addEventListener('click',()=>setMotionPolicy('always'));
  $('lab-motion-reduced').addEventListener('click',()=>setMotionPolicy('never'));
  $('respect-motion').addEventListener('click',()=>setMotionPolicy('respect'));
  $('retry-renderer').addEventListener('click',()=>{specimen.retry();updateStats();});
  $('portable-button').addEventListener('click',()=>{applyPatch({forceFallback:!state.configs[state.current].forceFallback});renderControls();updateStats();});
  $('export-button').addEventListener('click',downloadConfiguration);
  $('import-button').addEventListener('click',()=>$('import-input').click());
  $('import-input').addEventListener('change',async event=>{
    const file=event.target.files?.[0];if(!file)return;
    try{if(file.size>100000)throw new Error('Configuration file exceeds 100 KB.');Lab.apply(state,JSON.parse(await file.text()));select(state.current);toast('Configuration imported.');}catch(error){toast(error.message);}finally{event.target.value='';}
  });
  $('texture-input').addEventListener('change',async event=>{
    const file=event.target.files?.[0];if(!file)return;
    try{
      if(file.size>20000000)throw new Error('Choose an image under 20 MB.');
      const bitmap=await createImageBitmap(file);const scale=Math.min(1,2048/Math.max(bitmap.width,bitmap.height));
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
      customTexture=canvas;if(state.current==='water')specimen.source=canvas;$('texture-name').textContent=`${file.name} · ${canvas.width} × ${canvas.height}`;toast('Local water texture loaded. Image pixels are not included in exported settings.');
    }catch(error){toast(error.message);}
    finally{event.target.value='';}
  });
  $('clear-texture').addEventListener('click',()=>{
    customTexture=null;specimen.source=null;specimen.removeAttribute('src');
    $('texture-name').textContent='Built-in texture';
  });
  $('gallery-play').addEventListener('click',()=>{allAnimating=!allAnimating;for(const effect of galleryEffects.values())effect.configure({paused:!allAnimating});$('gallery-play').textContent=allAnimating?'Freeze all':'Animate all';$('gallery-play').setAttribute('aria-pressed',String(allAnimating));});

  window.addEventListener('hashchange',()=>{
    if(!location.hash.startsWith('#lab='))return;
    try{if(location.hash.length>24000)throw new Error('Shared configuration is too large.');Lab.apply(state,JSON.parse(decodeURIComponent(location.hash.slice(5))));select(state.current);toast('Shared scene loaded.');}catch(error){toast(error.message);}
  });
  renderNav();renderGallery();select(state.current);
  for(const group of [...new Set(Lab.CATALOG.map(item=>item.group))].sort()){const option=document.createElement('option');option.value=group;option.textContent=group;$('effect-group').append(option);}
  $('effect-search').addEventListener('input',filterCatalog);$('effect-group').addEventListener('change',filterCatalog);filterCatalog();
  let timer=setInterval(()=>{if(!document.hidden)updateStats();},500);
  window.addEventListener('pagehide',()=>{Lab.save(state);clearInterval(timer);timer=null;});
  window.addEventListener('pageshow',()=>{if(!timer)timer=setInterval(()=>{if(!document.hidden)updateStats();},500);});
  if(notice)toast(notice);
  $('study-count').textContent=Lab.CATALOG.length+' STUDIES';
  globalThis.MaterialLab={select,getState:()=>structuredClone(state),get element(){return specimen;},exportConfiguration:()=>Lab.serialize(state),diagnose:runDiagnostics,enableMotion:()=>setMotionPolicy('always'),respectMotion:()=>setMotionPolicy('respect'),debugReport};
})();
