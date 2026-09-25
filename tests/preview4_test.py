"""Preview 4 behavior checks using native Canvas pixels, plus explicitly separate GL API checks."""
import json
import os
import shutil
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'tests/validation';OUT.mkdir(exist_ok=True)
checks=[]
def check(name,value):
 checks.append({'name':name,'passed':bool(value)})
 assert value,name

def main():
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
  page=browser.new_page(viewport={'width':1100,'height':800},reduced_motion='no-preference')
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content('<div id="mount" style="position:relative;width:360px;height:220px;border-radius:24px"></div>')
  page.add_script_tag(content=(ROOT/'dist/frontend-toolkit.js').read_text())
  cases=page.evaluate('''()=>{
   const tests=[],check=(name,value)=>{tests.push({name,passed:!!value});if(!value)throw Error(name);};
   const FT=FrontendToolkit;
   function hash(canvas){const d=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let value=2166136261,alpha=0;for(let i=0;i<d.length;i++){value=Math.imul(value^d[i],16777619);if(i%4===3)alpha+=d[i];}return{hash:value>>>0,alpha};}
   // Read pixels on either side of the border, not merely CSS transparency declarations.
   const glow=FT.createGlowRenderer(mount,{...FT.getDefaults('glow','mono'),trail:1,glow:22,width:5,quality:1,dprCap:1});glow.resize(360,220);
   function glowSamples(mode){glow.setOptions({bloomPlacement:mode});glow.render(.6);const c=glow.canvas,pad=-parseFloat(c.style.left),scale=c.width/parseFloat(c.style.width),ctx=c.getContext('2d'),a=(x,y)=>ctx.getImageData(Math.round(x*scale),Math.round(y*scale),1,1).data[3];return{center:a(pad+180,pad+110),inside:a(pad+180,pad+16),outside:a(pad+180,pad-12)};}
   const outer=glowSamples('outside'),inner=glowSamples('inside'),both=glowSamples('both');
   check('Outside bloom leaves the interior unpainted',outer.inside===0&&outer.outside>0&&outer.center===0);
   check('Inside bloom lights the interior without exterior bloom',inner.inside>0&&inner.outside===0&&inner.center===0);
   check('Both bloom paints on both sides',both.inside>0&&both.outside>0);
   glow.setOptions({speedMode:'pixels',velocity:125});const v1=glow.getState().linearSpeed;glow.resize(720,440);check('Pixel speed survives a doubled element size',glow.getState().linearSpeed===v1);
   glow.setOptions({speedMode:'duration',duration:6});const lap=glow.getState();check('Duration mode derives speed from perimeter',Math.abs(lap.linearSpeed*6-lap.perimeterPixels)<.51);glow.destroy();

   const create=trigger=>{const r=FT.createTrailRenderer(mount,{...FT.getDefaults('trail','garden'),trigger,throttle:['hover','press','auto'].includes(trigger)?'time':'distance',timeInterval:5,life:.3,emission:200,gravity:0,spread:0,turbulence:0,adaptive:false});r.resize(360,220);r.render(0);return r;};
   let r=create('move');r.render(.03);r.render(.06);check('Default pointer trail emits nothing before entry',r.getState().spawned===0);
   r.setPointer({active:true,x:.3,y:.5,dx:0,dy:0,event:'pointerenter'});r.render(.09);check('Entering without movement does not create a trail',r.getState().spawned===0);
   r.setPointer({active:true,x:.7,y:.6,dx:.4,dy:.1,event:'pointermove'});r.render(.12);const spawned=r.getState().spawned;check('A consumed pointer segment emits visible particles',spawned>0&&hash(r.canvas).alpha>0);
   r.render(.15);r.render(.18);check('A parked cursor does not continue a move-only trail',r.getState().spawned===spawned);
   r.setPointer({active:false,x:2,y:.5,event:'pointerleave'});for(let t=.2;t<1;t+=.1)r.render(t);check('After leaving, old particles drain without new emission',r.getState().spawned===spawned&&r.getState().particles===0&&hash(r.canvas).alpha===0);r.destroy();
   r=create('hover');r.setPointer({active:true,x:.5,y:.5,event:'pointerenter'});r.render(.03);r.render(.06);check('Hover emits at a stationary in-bounds pointer',r.getState().spawned>0);r.setPointer({active:false,x:1.5,y:.5});const h=r.getState().spawned;r.render(.09);check('Hover stops emitting outside the element',r.getState().spawned===h);r.destroy();
   r=create('press');r.setPointer({active:true,x:.5,y:.5,down:false,event:'pointermove'});r.render(.03);check('Press does not emit on hover',r.getState().spawned===0);r.setPointer({active:true,x:.5,y:.5,down:true,event:'pointerdown'});r.render(.06);check('Press emits while held',r.getState().spawned>0);const ps=r.getState().spawned;r.setPointer({active:true,x:.5,y:.5,down:false,event:'pointerup'});r.render(.09);check('Press releases cleanly',r.getState().spawned===ps);r.destroy();
   r=create('click');r.setPointer({active:true,x:.5,y:.5,down:true,event:'pointerdown'});r.render(.03);const clickCount=r.getState().spawned;r.render(.06);r.setPointer({active:true,x:.6,y:.5,down:true,event:'pointermove'});r.render(.09);check('Click makes one bounded burst, not a continuous held emitter',clickCount===24&&r.getState().spawned===24);r.destroy();
   r=create('auto');r.render(.03);r.render(.06);check('Explicit auto mode intentionally emits without a pointer',r.getState().spawned>0);r.destroy();
   r=create('manual');r.setPointer({active:true,x:.5,y:.5,down:true,event:'pointerdown'});r.render(.03);check('Manual ignores normal pointer triggers',r.getState().spawned===0);r.burst({count:150});r.render(.06);const mixed=r.getState();check('Manual burst samples multiple colors, variants and kinds',mixed.liveColors===4&&mixed.liveVariants===4&&mixed.liveShapes===2);r.setOptions({count:40});check('Budget reductions immediately cap live particles',r.getState().particles===40);r.setQuality({scale:.5,particles:.5,name:'Test'});check('Adaptive particle budgets apply to already live particles',r.getState().particles===20);r.destroy();
   r=create('manual');r.setOptions({variantMode:'fixed',variant:2,colorMode:'single'});r.burst({count:80});r.render(.03);check('Fixed variant and single color are deterministic choices',r.getState().liveVariants===1&&r.getState().liveColors===1);r.destroy();
   check('Particle and glow teardown leaves no canvases behind',mount.childElementCount===0);

   const defaults=(family,preset,patch={})=>({...FT.getDefaults(family,preset),forceFallback:true,adaptive:false,...patch});
   for(const [family,preset] of [['sea','golden'],['art','metaballs'],['art','silk'],['art','interference'],['art','tunnel'],['sketch','orbit'],['sketch','constellation'],['sketch','lightning'],['sketch','blobs'],['sketch','jellyfish']]){
    const create=FT['create'+family[0].toUpperCase()+family.slice(1)+'Renderer'],r=create(mount,defaults(family,preset));r.resize(360,220);r.render(.11);const a=hash(r.canvas);r.render(.37);const b=hash(r.canvas);check(preset+': actual native Canvas pixels change',a.hash!==b.hash&&a.alpha>0&&b.alpha>0);
    r.setOptions({interactive:false});r.setPointer?.({active:true,x:.1,y:.1});r.render(.4);r.resize(8000,7000);r.render(.45);check(preset+': resize is bounded and disabling interaction is safe',Math.max(r.canvas.width,r.canvas.height)<=2048);r.destroy();
   }
   const rain=FT.createFieldRenderer(mount,defaults('field','rain'));rain.resize(720,320);rain.render(1.1);check('Portable rain uses crisp vector strokes rather than a 256px pixel grid',rain.canvas.width>256);rain.destroy();
   return tests;
  }''')
  checks.extend(cases)
  # Test live preference changes through actual custom elements and the managed scheduler.
  page.emulate_media(reduced_motion='reduce')
  page.evaluate("mount.innerHTML='<ft-fire id=fx><button id=content>Still usable</button></ft-fire>';fx.style.cssText='width:360px;height:220px'")
  page.wait_for_timeout(160)
  check('Reduced-motion fire is suppressed without allocating a frozen renderer',page.evaluate("fx.getStats().motionPresentation==='hide'&&fx.controller.renderer===null&&fx.shadowRoot.querySelector('.layer').style.visibility==='hidden'"))
  check('Suppressed decoration does not hide real content',page.locator('#content').is_visible())
  page.evaluate("fx.configure({motion:'always'})");page.wait_for_timeout(250)
  check('Explicit viewer override creates and animates fire',page.evaluate('fx.getStats().animating&&fx.getStats().frames>1'))
  page.evaluate("fx.configure({motion:'respect'})");page.wait_for_timeout(100)
  check('Returning to respect releases the suppressed fire renderer',page.evaluate('fx.controller.renderer===null&&!fx.getStats().scheduled'))
  page.evaluate("mount.innerHTML='<ft-water id=fx content-mode=submerged>Undistorted content</ft-water>';fx.style.cssText='width:360px;height:220px'")
  page.wait_for_timeout(240)
  check('Reduced-motion water selects a calm presentation',page.evaluate("fx.getStats().motionPresentation==='calm'&&!fx.getStats().animating"))
  check('Calm water leaves real content unwarped',page.evaluate("fx.shadowRoot.querySelector('.content').style.filter===''") )
  check('Calm water does not mutate user-requested optics',page.evaluate('fx.options.distortion>0&&fx.options.contentDistortion>0'))
  page.evaluate("fx.configure({reducedMotion:'subtle'})");page.wait_for_timeout(250)
  check('Developer-selected subtle mode animates slowly without content distortion',page.evaluate("fx.getStats().animating&&fx.getStats().motionPresentation==='subtle'&&fx.shadowRoot.querySelector('.content').style.filter===''") )
  page.evaluate("fx.configure({motion:'never'})");page.wait_for_timeout(150)
  check('Never selects calm water even with subtle selected',page.evaluate("!fx.getStats().animating&&fx.getStats().motionPresentation==='calm'"))
  page.emulate_media(reduced_motion='no-preference');page.evaluate("fx.configure({motion:'respect',reducedMotion:'auto'})");page.wait_for_timeout(150)
  check('Returning to full motion restores submerged content',page.evaluate("fx.shadowRoot.querySelector('.content').style.filter.includes('url')&&fx.getStats().animating"))
  page.evaluate("mount.innerHTML='<ft-trail id=fx trigger=press throttle=time></ft-trail>';fx.style.cssText='width:360px;height:220px'");page.wait_for_timeout(100)
  page.dispatch_event('#fx','pointerdown',{'clientX':100,'clientY':100,'buttons':1,'pointerType':'mouse'});page.wait_for_timeout(100)
  page.evaluate("dispatchEvent(new Event('blur'))");before=page.evaluate('fx.getStats().spawned');page.wait_for_timeout(150)
  check('Window focus loss stops a held trail emitter',page.evaluate('fx.getStats().spawned')==before)
  page.evaluate('mount.replaceChildren()');page.wait_for_timeout(150)
  check('New motion paths and blur listeners leave no frame jobs after teardown',page.evaluate('FrontendToolkit.schedulerStats().jobs===0'))
  check('No uncaught exceptions in native behavior tests',not errors)
  page.close()

  # An instrumented WebGL API checks upload/configuration, not actual shader execution.
  page=browser.new_page();page.set_content('<div id=mount style="width:600px;height:300px;border-radius:24px"></div>')
  for f in ['tests/fixtures/webgl-contract-stub.js','dist/frontend-toolkit.js']:page.add_script_tag(content=(ROOT/f).read_text())
  cases=page.evaluate('''()=>{
   const tests=[],check=(name,value)=>{tests.push({name,passed:!!value});if(!value)throw Error(name);};
   const FT=FrontendToolkit,r=FT.createFireRenderer(mount,{...FT.getDefaults('fire','flamethrower'),sourceEdge:'all',outPolicy:'border',respectGravity:false});r.resize(600,300);r.render(1);
   let u=r.device.gl.state.uniformValues;check('All source edges reach the shader independently from rightward direction',u.uEdge===5&&u.uDirection===1);check('Border visibility and disabled gravity reach the shader',u.uBorder===1&&u.uGravity===0);
   r.setOptions({outPolicy:'strict',respectGravity:true,gravity:2});r.render(2);u=r.device.gl.state.uniformValues;check('Live policy/gravity edits do not rewrite the chosen source edges',u.uBorder===0&&u.uGravity===2&&u.uEdge===5);r.destroy();
   for(const family of ['sea','art']){const r=FT['create'+family[0].toUpperCase()+family.slice(1)+'Renderer'](mount,{});r.resize(600,300);r.render(1);check(family+': shader uniforms are finite',Object.values(r.device.gl.state.uniformValues).every(v=>Array.isArray(v)?v.every(Number.isFinite):typeof v!=='number'||Number.isFinite(v)));const c=r.canvas;c.dispatchEvent(new Event('webglcontextlost',{cancelable:true}));r.render(2);check(family+': context loss switches to the portable renderer',r.getState().backend==='Canvas 2D fallback');c.dispatchEvent(new Event('webglcontextrestored'));r.render(3);check(family+': context restoration rebuilds the shader path',r.getState().backend==='WebGL');r.destroy();}
   check('New GPU families dispose all mount children',mount.childElementCount===0);return tests;
  }''')
  checks.extend(cases);page.close();browser.close()
 (OUT/'preview4-report.json').write_text(json.dumps({'nativeCanvasAndWebGLAPIContractChecks':len(checks),'checks':checks},indent=2))
 print(f'{len(checks)} Preview 4 checks passed. Native Canvas plus explicitly separated instrumented WebGL API checks; not native browser GPU execution.')
if __name__=='__main__':main()
