"""Preview 5: real Canvas pixels, pointer lifecycle and live custom-element controls.

WebGL execution is tested separately through EGL, not imitated by these checks.
"""
import json
import mimetypes
from urllib.parse import urlparse
import os
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'tests/validation'
OUT.mkdir(exist_ok=True)
checks=[]
def check(name,value):
    checks.append({'name':name,'passed':bool(value)})
    assert value,name
def main():
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
        page=browser.new_page(viewport={'width':1100,'height':850},reduced_motion='no-preference')
        errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
        page.set_content('<div id="mount" style="position:relative;width:600px;height:300px;border-radius:24px"></div>')
        page.add_script_tag(content=(ROOT/'dist/frontend-toolkit.js').read_text())
        results=page.evaluate('''()=>{
          const FT=FrontendToolkit,tests=[],check=(name,ok)=>{tests.push({name,passed:!!ok});if(!ok)throw Error(name);};
          const config=(f,p={})=>({...FT.getDefaults(f),adaptive:false,dprCap:1,...p});
          const hash=c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let h=2166136261,a=0;for(let i=0;i<d.length;i++){h=Math.imul(h^d[i],16777619);if(i%4===3)a+=d[i];}return {h:h>>>0,a};};
          function brush(patch={}){const r=FT.createTrailRenderer(mount,config('trail',{life:5,count:800,distanceInterval:20,size:4,spread:0,turbulence:0,gravity:0,...patch}));r.resize(600,300);r.render(0);return r;}
          function stroke(r,n){for(let i=0;i<=n;i++)r.setPointer({x:.1+.8*i/n,y:.5,active:true,timeStamp:i*100/n,event:i?'pointermove':'pointerenter'});r.render(.10);}
          let r=brush();stroke(r,1);check('Coarse pointer stroke emits 24 distance-spaced particles',r.getState().spawned===24);check('Distance trail paints actual native Canvas pixels',hash(r.canvas).a>0);const a=r.getState().spawned;r.render(.2);check('Stationary move-only brush emits no more particles',r.getState().spawned===a);r.destroy();
          r=brush();stroke(r,48);check('Dense pointer events produce the same emission count',r.getState().spawned===24);r.destroy();
          r=brush({throttle:'time',timeInterval:20,trigger:'hover'});r.setPointer({x:.5,y:.5,active:true,timeStamp:0});for(let i=1;i<=5;i++)r.render(i*.02);check('Time interval controls stationary hover emission',r.getState().spawned===5);r.suspendInput();const n=r.getState().spawned;r.render(.2);check('Input suspension drains no stale hover samples',r.getState().spawned===n);r.destroy();
          r=brush({trigger:'press'});r.setPointer({x:.2,y:.5,active:true,down:true,timeStamp:0});r.render(.1);check('Distance press waits for actual movement',r.getState().spawned===0);r.setPointer({x:.8,y:.5,active:true,down:true,timeStamp:100});r.render(.2);check('Held distance brush emits along its stroke',r.getState().spawned===18);r.setPointer({x:2,y:.5,active:false,event:'pointercancel'});r.setPointer({x:.1,y:.5,active:true,down:true,timeStamp:200});r.render(.3);check('Reentry after cancellation does not connect distant strokes',r.getState().spawned===18);r.destroy();
          r=brush({trigger:'both'});stroke(r,1);for(let i=1;i<=30;i++)r.render(.1+i/60);check('Both combines autonomous and pointer emissions',r.getState().spawned>24);r.destroy();
          r=brush();r.setPointer({x:0,y:.5,active:true,timeStamp:0});r.setPointer({x:1,y:.5,active:true,timeStamp:10});r.setOptions({distanceInterval:8});r.render(.1);check('Changing throttle resets queued old samples',r.getState().spawned===0);r.destroy();
          r=brush({trigger:'move',throttle:'time',timeInterval:20});r.setPointer({x:.2,y:.5,active:true,timeStamp:0});r.setPointer({x:.3,y:.5,active:true,timeStamp:60});r.render(.1);const early=r.getState().spawned;r.setPointer({x:.4,y:.5,active:true,timeStamp:3000});r.render(.2);check('Time-based move trigger does not replay seconds of idle cursor history',r.getState().spawned===early+1);r.destroy();
          let contexts=0;const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...a){if(/webgl/.test(type))contexts++;return get.call(this,type,...a);};
          r=FT.createFieldRenderer(mount,config('field',{kind:'rain',transparent:true,rainGust:0,rainWind:40}));r.resize(600,300);r.render(0);const rain0=hash(r.canvas);r.render(.05);const rain1=hash(r.canvas);check('Rain animates native pixels with no WebGL allocation',rain0.h!==rain1.h&&rain1.a>0&&contexts===0);check('Rain diagnostics expose explicit CSS-pixel speed',r.getState().rainSpeed===620&&r.getState().rainWind===40);
          r.setOptions({rainSpeed:0,rainWind:0,rainGust:0});r.render(.1);const still=hash(r.canvas);r.render(.2);check('Zero rain velocity is static, without random jitter',hash(r.canvas).h===still.h&&!r.animated);
          r.setOptions({rainDensity:0});r.render(.3);check('Zero rain density leaves a transparent empty layer',hash(r.canvas).a===0&&r.getState().drops===0);
          r.setOptions({rainDensity:1,rainSpeed:800});r.resize(10000,9000);r.render(.4);check('Rain pixel and particle budgets are bounded on huge hosts',r.canvas.width*r.canvas.height<=1250000&&Math.max(r.canvas.width,r.canvas.height)<=2048&&r.getState().drops<=1100);
          r.setOptions({kind:'ocean',forceFallback:true});r.resize(600,300);r.render(.5);check('Switching Rain to a GPU-family fallback replaces the backend cleanly',r.getState().backend==='Canvas 2D fallback'&&mount.querySelectorAll('canvas').length===1);
          r.setOptions({kind:'rain'});r.render(.6);check('Switching back reuses the field API without a duplicate canvas',r.getState().backend==='Canvas layered rain'&&mount.querySelectorAll('canvas').length===1);r.destroy();HTMLCanvasElement.prototype.getContext=get;
          r=FT.createArtRenderer(mount,config('art',{forceFallback:true,kind:'metaballs',interactionMode:'pointer'}));r.resize(600,300);r.render(0);const before=hash(r.canvas);r.render(.1);check('Pointer-only metal rests without autonomous drift',before.h===hash(r.canvas).h&&!r.animated);
          r.setPointer({x:.2,y:.5,active:true});r.setPointer({x:.8,y:.5,active:true});for(let i=1;i<=20;i++)r.render(.1+i/60);check('Local metal brush reaches several nearby surfaces',r.getState().affectedBodies>=2);check('Local metal physics changes actual fallback pixels',before.h!==hash(r.canvas).h);
          r.setOptions({interactionMode:'auto'});const energy=r.getState().kineticEnergy;r.setPointer({x:.1,y:.1,active:true});r.setPointer({x:.9,y:.9,active:true});check('Auto mode does not inject pointer impulses',r.getState().kineticEnergy===energy);r.destroy();
          for(const [family,kind] of [['art','silk'],['art','tunnel'],['sketch','orbit'],['sketch','jellyfish'],['field','lava'],['field','nebula'],['field','ocean'],['sea',null]]){
            const renderer=FT['create'+family[0].toUpperCase()+family.slice(1)+'Renderer'](mount,config(family,{forceFallback:true,...(kind?{kind}:{})}));renderer.resize(480,260);renderer.render(.2);const first=hash(renderer.canvas);renderer.setPointer?.({x:.1,y:.1,active:true,dx:-.4,dy:-.4});renderer.render(.2);renderer.setPointer?.({x:.9,y:.9,active:true,dx:.8,dy:.8});renderer.render(.2);check((kind||family)+': no opposite-pointer scene/camera motion',hash(renderer.canvas).h===first.h);renderer.destroy();
          }
          for(const [family,kind] of [['art','interference'],['field','magnetic'],['sketch','constellation'],['sketch','blobs'],['smoke',null]]){
            const renderer=FT['create'+family[0].toUpperCase()+family.slice(1)+'Renderer'](mount,config(family,{forceFallback:true,interactionMode:'pointer',...(kind?{kind}:{})}));renderer.resize(480,260);renderer.render(.2);renderer.setPointer({x:.2,y:.3,active:true,dx:0,dy:0});renderer.render(.2);const first=hash(renderer.canvas);renderer.setPointer({x:.7,y:.6,active:true,dx:.5,dy:.3});renderer.render(.2);check((kind||family)+': meaningful local interaction remains available',hash(renderer.canvas).h!==first.h);check((kind||family)+': pointer-only mode needs no continuous frame job',!renderer.animated);renderer.destroy();
          }
          r=FT.createSketchRenderer(mount,config('sketch',{kind:'lightning',strikeTrigger:'manual'}));r.resize(600,300);r.render(0);check('Manual lightning is absent until explicitly triggered',hash(r.canvas).a===0&&!r.animated);r.burst({x:.75,y:.1});r.render(.02);r.render(.08);check('Lightning has irregular multiscale channels, not sparse spokes',r.getState().lightningVertices>100&&r.getState().lightningChannels>1);check('A discharge paints a narrow luminous channel',hash(r.canvas).a>0);r.render(2);check('Manual lightning settles to transparency and releases its clock',hash(r.canvas).a===0&&!r.animated);r.destroy();
          check('All renderer teardown paths remove their canvas nodes',mount.childElementCount===0);return tests;
        }''')
        checks.extend(results)
        # Actual custom elements: no direct renderer shortcuts for input/motion tests.
        page.evaluate("mount.innerHTML='<ft-trail id=fx throttle=time time-interval=15 trigger=hover><button id=child>Real button</button></ft-trail>';fx.style.cssText='width:600px;height:300px';")
        page.wait_for_function('fx.controller?.renderer')
        page.dispatch_event('#fx','pointerenter',{'clientX':120,'clientY':120,'buttons':0,'pointerType':'mouse','isPrimary':True})
        page.wait_for_timeout(140)
        check('Declarative time throttle accepts a stationary hover',page.evaluate('fx.getStats().spawned>0'))
        page.evaluate('fx.pause()');page.wait_for_timeout(30)
        paused=page.evaluate('fx.getStats().spawned')
        page.dispatch_event('#fx','pointermove',{'clientX':530,'clientY':150,'buttons':0,'pointerType':'mouse','isPrimary':True})
        page.evaluate('fx.play()');page.wait_for_timeout(140)
        check('Pause/resume does not replay an old pointer sample or held emitter',page.evaluate('fx.getStats().spawned')==paused)
        page.dispatch_event('#fx','pointerenter',{'clientX':130,'clientY':150,'buttons':0,'pointerType':'mouse','isPrimary':True});page.wait_for_timeout(80)
        page.dispatch_event('#fx','pointercancel',{'clientX':130,'clientY':150,'buttons':0,'pointerType':'mouse','isPrimary':True});page.wait_for_timeout(20)
        cancelled=page.evaluate('fx.getStats().spawned');page.wait_for_timeout(120)
        check('Pointer cancellation ends stationary emission',page.evaluate('fx.getStats().spawned')==cancelled)
        page.dispatch_event('#child','pointermove',{'clientX':15,'clientY':15,'buttons':0,'pointerType':'mouse','isPrimary':True});page.wait_for_timeout(100)
        check('Native content controls do not start a decorative brush',page.evaluate('fx.getStats().spawned')==cancelled)
        page.evaluate("fx.configure({trigger:'move',throttle:'distance',distanceInterval:20});fx.clear()")
        page.wait_for_timeout(60)
        emitted=page.evaluate('fx.getStats().spawned')
        page.evaluate('''()=>{
          const b=fx.getBoundingClientRect(),y=b.top+150;
          fx.dispatchEvent(new PointerEvent('pointerenter',{clientX:b.left+60,clientY:y,isPrimary:true}));
          const e=new PointerEvent('pointermove',{clientX:b.left+540,clientY:y,isPrimary:true});
          Object.defineProperty(e,'getCoalescedEvents',{value:()=>[new PointerEvent('pointermove',{clientX:b.left+300,clientY:y}),new PointerEvent('pointermove',{clientX:b.left+540,clientY:y})]});fx.dispatchEvent(e);
        }''');page.wait_for_timeout(80)
        check('Optional coalesced input preserves CSS-distance spacing',page.evaluate('fx.getStats().spawned')-emitted==24)
        page.emulate_media(reduced_motion='reduce');page.wait_for_timeout(80)
        check('Reduced motion suppresses trails and discards the input queue',page.evaluate("fx.getStats().motionPresentation==='hide'&&fx.controller.renderer===null"))
        page.evaluate("mount.innerHTML='<ft-sea id=fx></ft-sea>';fx.style.cssText='width:600px;height:300px';fx.configure({forceFallback:true})")
        page.wait_for_function('fx.controller?.renderer')
        check('Reduced-motion sea uses flat geometry, not a frozen crest',page.evaluate("fx.getStats().motionPresentation==='calm'&&fx.controller.renderer.getUniforms().uAmplitude===0&&fx.options.waveHeight>0"))
        t=page.evaluate('fx.getStats().time');page.wait_for_timeout(120)
        check('Calm sea requests no animation frames',page.evaluate('fx.getStats().time')==t and page.evaluate('!fx.getStats().scheduled'))
        page.evaluate("fx.configure({motion:'always'})");page.wait_for_timeout(220)
        check('Explicit motion override restores waves and managed time',page.evaluate('fx.controller.renderer.getUniforms().uAmplitude>0&&fx.getStats().time>0'))
        page.evaluate("fx.configure({motion:'never',reducedMotion:'subtle'})");page.wait_for_timeout(80)
        check('Never cannot accidentally enable subtle autonomous waves',page.evaluate("!fx.getStats().animating&&fx.getStats().motionPresentation==='calm'"))
        page.evaluate("mount.innerHTML='<ft-sketch id=fx kind=lightning reduced-motion=subtle></ft-sketch>';fx.style.cssText='width:600px;height:300px'");page.wait_for_timeout(100)
        check('Reduced-motion lightning is suppressed even in subtle mode',page.evaluate("fx.getStats().motionPresentation==='hide'"))
        page.emulate_media(reduced_motion='no-preference');page.evaluate('mount.replaceChildren()');page.wait_for_timeout(150)
        check('Controller listeners and frame jobs are cleaned up',page.evaluate('FrontendToolkit.schedulerStats().jobs===0'))
        # Screenshots use actual native Canvas renderers.
        for family,preset in [('sketch','lightning'),('field','rain')]:
            page.evaluate('''([family,preset])=>{mount.replaceChildren();mount.style.background='#071017';const r=FrontendToolkit['create'+family[0].toUpperCase()+family.slice(1)+'Renderer'](mount,{...FrontendToolkit.getDefaults(family,preset),quality:1,dprCap:1});r.resize(600,300);r.render(0);r.render(.07);window.previewRenderer=r;}''',[family,preset])
            page.locator('#mount').screenshot(path=str(OUT/f'preview5-{preset}.png'))
            page.evaluate('previewRenderer.destroy()')
        # The environment blocks top-level navigation. Serve unchanged resource
        # bytes through an offline HTTPS fixture; this is not a network test.
        page.close();page=browser.new_page(viewport={'width':1100,'height':850},reduced_motion='no-preference');page.on('pageerror',lambda error:errors.append(str(error)))
        base='https://toolkit.test'
        def serve(route):
            path=(ROOT/urlparse(route.request.url).path.lstrip('/')).resolve()
            if path.is_file() and path.is_relative_to(ROOT):
                route.fulfill(status=200,body=path.read_bytes(),headers={'Content-Type':mimetypes.guess_type(path)[0] or 'application/octet-stream','Access-Control-Allow-Origin':'*'})
            else:route.fulfill(status=404,body='missing')
        page.route(base+'/**',serve)
        page.set_content((ROOT/'lab.html').read_text().replace('<head>','<head><base href="https://toolkit.test/">'))
        page.wait_for_function('window.MaterialLab&&window.ToolkitLab')
        page.locator('#effect-nav [data-id="rain"]').click();page.wait_for_timeout(150)
        check('Rain speed has a visible dedicated inspector control',page.locator('#option-rainSpeed').is_visible())
        check('Rain exposes its actual droplet color rather than an unused shader parameter',page.locator('#option-color2').is_visible())
        page.locator('#effect-nav [data-id="stars"]').click();page.wait_for_timeout(80)
        check('Trail inspector defaults to distance spacing',page.locator('#option-throttle').input_value()=='distance' and page.locator('#option-distanceInterval').is_visible())
        page.select_option('#option-throttle','time');page.wait_for_timeout(80)
        check('Choosing Time reveals milliseconds and hides pixel spacing',page.locator('#option-timeInterval').is_visible() and page.locator('#option-distanceInterval').count()==0)
        page.locator('#effect-nav [data-id="metaballs"]').click();page.wait_for_timeout(80)
        check('Liquid metal exposes motion source and local brush controls',page.locator('#option-interactionMode').is_visible() and page.locator('#option-interactionRadius').is_visible())
        page.locator('#effect-nav [data-id="silk"]').click();page.wait_for_timeout(60)
        check('Pure compositions do not expose misleading pointer-camera controls',page.locator('#option-interactive').count()==0 and page.locator('#option-interactionMode').count()==0)
        page.locator('#effect-nav [data-id="lightning"]').click();page.wait_for_timeout(60)
        check('Lightning has distinct strike-trigger and irregularity controls',page.locator('#option-strikeTrigger').is_visible() and page.locator('#option-jaggedness').is_visible())
        page.screenshot(path=str(OUT/'preview5-demo-desktop.png'))
        page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(100)
        check('Narrow demo layout does not create horizontal page overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
        page.screenshot(path=str(OUT/'preview5-demo-mobile.png'))
        check('No uncaught exceptions in native renderers or demo',not errors)
        selective=browser.new_page(viewport={'width':900,'height':600});fetched=[]
        selective.on('request',lambda request:fetched.append(request.url))
        selective.route(base+'/**',serve)
        selective.set_content('<ft-trail id=fx trigger=manual style="width:500px;height:220px"></ft-trail>')
        selective.add_script_tag(type='module',content="import * as FT from 'https://toolkit.test/dist/frontend-toolkit.loader.js';window.fixtureToolkit=FT;")
        selective.wait_for_function('document.querySelector("#fx").controller?.renderer')
        check('Selective and classic entries report the same current version',selective.evaluate("fixtureToolkit.version==='1.0.0'"))
        check('Selective trail loading fetches the new sampler transitively',any('/core/path-sampler.js' in url for url in fetched))
        check('Selective trail loading does not fetch sea or metal renderers',not any('/shaders/sea.js' in url or '/shaders/art.js' in url for url in fetched))
        selective.evaluate("fx.remove();const m=document.createElement('ft-art');m.style.cssText='width:500px;height:220px';m.id='metal';m.setAttribute('force-fallback','true');document.body.append(m)")
        selective.wait_for_function('document.querySelector("#metal").controller?.renderer')
        check('Selective metal loading includes its local physics module',any('/core/metaball-motion.js' in url for url in fetched))
        browser.close()
    (OUT/'preview5-browser-report.json').write_text(json.dumps({'checks':checks,'nativeCanvasChecks':len(checks),'nativeWebGLExecution':False},indent=2))
    print(f'{len(checks)} Preview 5 native-browser checks passed (Canvas, interactions, motion policy, demo and selective imports).')
if __name__=='__main__':main()
