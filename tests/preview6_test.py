"""Preview 6 native Canvas, input, cache, accessibility and selective-loading checks.

This does not replace shader execution tests or hardware performance testing.
"""
import json
import mimetypes
import os
from pathlib import Path
import shutil
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'tests/validation'
OUT.mkdir(exist_ok=True)
checks=[]
def check(name,ok):
    checks.append({'name':name,'passed':bool(ok)})
    assert ok,name

def main():
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
        page=browser.new_page(viewport={'width':1180,'height':850},reduced_motion='no-preference')
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content('<style>body{margin:0;background:#081a21}#mount{position:relative;width:600px;height:300px;border-radius:24px}</style><div id="mount"></div>')
        page.add_script_tag(content=(ROOT/'dist/frontend-toolkit.js').read_text())
        page.evaluate('''()=>{
          const FT=FrontendToolkit;
          window.r=null;
          window.make=(family,preset,patch={})=>{r?.destroy();mount.replaceChildren();r=FT['create'+family[0].toUpperCase()+family.slice(1)+'Renderer'](mount,{...FT.getDefaults(family,preset),quality:1,dprCap:1,adaptive:false,...patch});r.resize(600,300);r.render(0);return r;};
          window.fingerprint=canvas=>{const d=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let hash=2166136261,alpha=0,lit=0;for(let i=0;i<d.length;i++){hash=Math.imul(hash^d[i],16777619);if(i%4===3){alpha+=d[i];if(d[i])lit++;}}return{hash:hash>>>0,alpha,lit};};
        }''')
        presets=page.evaluate("['highlight','backdrop','pattern','status'].flatMap(family=>Object.keys(FrontendToolkit.PRESETS[family]).map(preset=>[family,preset]))")
        for family,preset in presets:
            result=page.evaluate('''([f,p])=>{make(f,p,f==='highlight'?{activation:'auto',motionSource:'auto',idleIntensity:.65}:{});r.render(.3);const first=fingerprint(r.canvas);const animated=r.animated;r.render(1.15);const second=fingerprint(r.canvas);return{first,second,animated,state:r.getState()};}''',[family,preset])
            check(f'{family}/{preset} paints native pixels',result['first']['alpha']>0 or result['second']['alpha']>0)
            if result['animated']:
                check(f'{family}/{preset} has changing rendered frames',result['first']['hash']!=result['second']['hash'])
            else:
                check(f'{family}/{preset} remains static when expected',result['first']['hash']==result['second']['hash'])
            page.locator('#mount').screenshot(path=str(OUT/f'p6-{family}-{preset}.png'))
        results=page.evaluate('''()=>{
          const tests=[],check=(name,ok)=>{tests.push({name,passed:!!ok});if(!ok)throw Error(name);};
          const pixel=(canvas,x,y)=>Array.from(canvas.getContext('2d').getImageData(x,y,1,1).data);
          make('pattern','dots');const a=r.getState();r.render(2);r.render(4);const b=r.getState();check('Static patterns reuse both tile and final paint',a.tileBuilds===b.tileBuilds&&a.paintBuilds===b.paintBuilds);
          r.setOptions({fade:'radial',fadeStrength:1});r.render(4);check('Coverage changes repaint without rebuilding the tile',r.getState().tileBuilds===a.tileBuilds&&r.getState().paintBuilds>b.paintBuilds);
          const hash=fingerprint(r.canvas).hash;r.setOptions({spacing:32});r.render(4);check('Spacing rebuilds the pattern geometry',r.getState().tileBuilds>a.tileBuilds&&fingerprint(r.canvas).hash!==hash);
          r.setOptions({driftX:24});r.render(5);const moving=fingerprint(r.canvas).hash;r.render(6);check('Optional drift moves the actual pattern',r.animated&&moving!==fingerprint(r.canvas).hash);
          make('pattern','dots',{transparent:true});check('Pattern empty pixels are truly transparent',pixel(r.canvas,0,0)[3]===0);
          make('pattern','blueprint',{fade:'radial',fadeStrength:1});check('Pattern fade does not erase an opaque base',pixel(r.canvas,300,150)[3]===255);
          make('backdrop','wave-divider');check('Wave divider leaves a transparent region above its edge',pixel(r.canvas,300,10)[3]===0&&fingerprint(r.canvas).alpha>0);
          make('backdrop','bokeh');check('Bokeh uses three reusable aperture sprites',r.getState().cacheSprites===3);r.setOptions({driftSpeed:0});r.render(1);const cached=r.getState().paintBuilds;r.render(3);check('Static backdrops reuse a completed composition',r.getState().paintBuilds===cached);
          r.setOptions({count:80});r.setQuality({scale:.5,particles:.4,name:'Low'});r.render(1);check('Adaptive detail reduces decorative count and buffer size',r.getState().effectiveElements===32&&r.canvas.width===300);
          make('status','skeleton');const built=r.getState().geometryBuilds;r.render(.3);r.render(.6);check('Skeleton frame changes reuse cached placeholder geometry',r.getState().geometryBuilds===built);
          r.setOptions({lines:6});r.render(.6);check('Placeholder line count invalidates geometry only when changed',r.getState().geometryBuilds===built+1);
          r.setOptions({shimmer:false});r.render(1);const still=fingerprint(r.canvas).hash;r.render(3);check('Disabled shimmer is static',!r.animated&&fingerprint(r.canvas).hash===still);
          for(const kind of ['ring','bar','segments']){make('status',null,{kind,value:0,indeterminate:false,color:'#ff0000',trackColor:'#001122'});const zero=fingerprint(r.canvas);r.setOptions({value:.5});r.render(0);const half=fingerprint(r.canvas);r.setOptions({value:1});r.render(0);check(kind+' tracks real zero, half and full values',zero.hash!==half.hash&&half.hash!==fingerprint(r.canvas).hash&&!r.animated);}
          make('status','loading-dots',{amplitude:0});const d=fingerprint(r.canvas);r.render(5);check('Zero-amplitude dots change neither position nor opacity',!r.animated&&d.hash===fingerprint(r.canvas).hash);
          make('highlight','ripple',{activation:'manual',duration:1,maxPulses:4});r.burst({x:.5,y:.5});r.render(0);r.render(.2);check('Manual ripple paints a bounded transient',r.getState().pulses===1&&fingerprint(r.canvas).alpha>0);
          for(let i=0;i<100;i++)r.burst({x:.5,y:.5});r.render(.3);check('Pulse queues and live pulse counts are bounded',r.getState().pending===0&&r.getState().pulses<=4);
          r.render(2);r.render(3);check('Expired manual pulses stop and clear the canvas',!r.animated&&r.getState().pulses===0&&fingerprint(r.canvas).alpha===0);
          make('highlight','spotlight');r.setPointer({x:.8,y:.5,active:true,event:'pointerenter'});for(let i=1;i<100;i++)r.render(i/60);check('A settled hover spotlight stops its frame loop',!r.animated&&fingerprint(r.canvas).alpha>0);const left=r.canvas.getContext('2d').getImageData(0,0,250,300).data,right=r.canvas.getContext('2d').getImageData(350,0,250,300).data;const sum=d=>d.reduce((s,v,i)=>s+(i%4===3?v:0),0);check('Spotlight illumination follows the local pointer rather than translating content',sum(right)>sum(left));r.suspendInput();for(let i=100;i<190;i++)r.render(i/60);check('Hover exit clears the light and becomes idle',!r.animated&&fingerprint(r.canvas).alpha===0);
          for(const family of ['highlight','backdrop','pattern','status']){make(family);r.resize(12000,6000);r.render(0);check(family+' respects a 1.4 megapixel / 2048 side buffer budget',r.canvas.width<=2048&&r.canvas.height<=2048&&r.canvas.width*r.canvas.height<=1400000);r.resize(1,1);r.render(0);check(family+' accepts a tiny viewport without invalid geometry',r.canvas.width>=1&&r.canvas.height>=1);const c=r.canvas;r.destroy();check(family+' destroys and releases its canvas',!c.isConnected&&c.width===1&&c.height===1);r=null;}
          // The CanvasPattern.setTransform compatibility path preserves CSS sizing.
          const proto=CanvasPattern.prototype,method=proto.setTransform;proto.setTransform=undefined;
          make('pattern','grid',{spacing:30});r.render(1);check('Pattern renderer has a setTransform-free compatibility path',fingerprint(r.canvas).alpha>0);r.destroy();r=null;proto.setTransform=method;
          return tests;
        }''')
        checks.extend(results)
        # Seeded lightning photographs are actual Canvas draws, not screenshots of an imported reference.
        for seed in [3,7,19,47]:
            page.evaluate('(seed)=>{make("sketch","lightning",{seed});r.render(0);r.render(.06)}',seed)
            page.locator('#mount').screenshot(path=str(OUT/f'p6-lightning-{seed}.png'))
        page.evaluate('r.destroy();r=null;mount.replaceChildren()')
        page.evaluate("mount.innerHTML='<ft-highlight id=fx preset=ripple motion=always duration=.4 style=\"width:600px;height:300px\"><button id=child style=\"margin:100px\">Actual button</button></ft-highlight>';window.clicks=0;child.addEventListener('click',()=>clicks++)")
        page.wait_for_function('fx.controller?.renderer')
        page.locator('#child').click();page.wait_for_timeout(80)
        check('Click ripple coexists with native button activation',page.evaluate('clicks===1&&fx.getStats().pulses===1'))
        page.wait_for_timeout(700)
        check('The managed ripple clock sleeps after expiry',page.evaluate('!fx.getStats().scheduled&&fx.getStats().pulses===0'))
        page.locator('#child').focus();page.keyboard.press('Enter');page.wait_for_timeout(80)
        check('Keyboard button activation emits exactly one ripple and one native click',page.evaluate('clicks===2&&fx.getStats().pulses===1'))
        page.wait_for_timeout(650)
        page.evaluate('child.setAttribute("data-ft-no-interaction","")');page.locator('#child').click();page.wait_for_timeout(80)
        check('Explicit no-interaction content stays native without decoration',page.evaluate('clicks===3&&fx.getStats().pulses===0'))
        page.evaluate('child.removeAttribute("data-ft-no-interaction");fx.configure({activation:"manual"});fx.burst({x:.5,y:.5});fx.configure({paused:true})');page.wait_for_timeout(500)
        before=page.evaluate('fx.getStats().frames');page.evaluate('fx.burst({x:.1,y:.1})');page.wait_for_timeout(100)
        check('Paused effects do not accept hidden manual bursts',page.evaluate('fx.getStats().frames')==before)
        page.evaluate('fx.configure({paused:false,opacity:0});fx.clear()');page.wait_for_timeout(150)
        frames=page.evaluate('fx.getStats().frames');page.wait_for_timeout(200)
        check('Zero opacity stops frame work after the required update',page.evaluate('fx.getStats().frames')==frames and page.evaluate('!fx.getStats().scheduled'))
        page.evaluate('fx.configure({opacity:1,activation:"click",motion:"respect"})');page.emulate_media(reduced_motion='reduce');page.wait_for_timeout(120)
        check('System reduced motion suppresses ripple without hiding content',page.evaluate('fx.getStats().motionPresentation==="hide"&&fx.controller.renderer===null&&child.offsetWidth>0'))
        page.evaluate("mount.innerHTML='<ft-status id=fx kind=bar value=.32 style=\"width:600px;height:300px\"></ft-status>'")
        page.wait_for_function('fx.controller?.renderer')
        page.wait_for_function('fx.getStats().frames>0&&!fx.getStats().scheduled')
        check('Reduced motion preserves genuine determinate progress',page.evaluate('fx.getStats().value===.32&&!fx.getStats().scheduled'))
        page.evaluate('fx.configure({value:.9})');page.wait_for_timeout(100)
        check('Determinate progress updates even when motion is reduced',page.evaluate('fx.getStats().value===.9&&!fx.getStats().scheduled'))
        page.emulate_media(reduced_motion='no-preference')
        page.evaluate('mount.replaceChildren();window.button=document.createElement("button");button.textContent="Submit";button.style.cssText="width:220px;height:60px;border-radius:18px";mount.append(button);window.nativeClicks=0;button.addEventListener("click",()=>nativeClicks++);window.c=FrontendToolkit.mountEffect(button,{effect:"highlight",preset:"ripple",duration:.3,motion:"always"})')
        page.wait_for_function('c.renderer');page.locator('#mount > button').click();page.wait_for_timeout(60)
        check('mountEffect supplies preset configuration and pointer behavior to ordinary buttons',page.evaluate('nativeClicks===1&&c.options.kind==="ripple"&&c.getStats().pulses===1'))
        page.evaluate('c.destroy()');page.wait_for_timeout(100)
        check('Ordinary-element teardown removes layers, input and positioning changes',page.evaluate('!button.querySelector("canvas")&&button.style.position===""&&FrontendToolkit.schedulerStats().jobs===0'))
        page.evaluate('window.a=FrontendToolkit.mountEffect(button,{effect:"pattern",preset:"dots"});window.b=FrontendToolkit.mountEffect(button,{effect:"highlight",preset:"foil"});a.destroy();a.destroy()')
        check('Destroying one of two ordinary-element effects retains shared positioning',page.evaluate('button.style.position==="relative"&&button.querySelectorAll("[data-ft-layer]").length===1'))
        page.evaluate('b.destroy()')
        check('The last effect restores the preexisting position exactly once',page.evaluate('button.style.position===""&&button.querySelectorAll("[data-ft-layer]").length===0'))
        # Browser demo and selective modules, served as unchanged bytes over an offline fixture.
        page.close();page=browser.new_page(viewport={'width':1180,'height':850},reduced_motion='no-preference');page.on('pageerror',lambda e:errors.append(str(e)))
        base='https://toolkit.test'
        def serve(route):
            path=(ROOT/urlparse(route.request.url).path.lstrip('/')).resolve()
            if path.is_relative_to(ROOT) and path.is_file():route.fulfill(status=200,body=path.read_bytes(),headers={'Content-Type':mimetypes.guess_type(path)[0] or 'application/octet-stream','Access-Control-Allow-Origin':'*'})
            else:route.fulfill(status=404,body='missing')
        page.route(base+'/**',serve)
        page.set_content((ROOT/'lab.html').read_text().replace('<head>','<head><base href="https://toolkit.test/">'))
        page.wait_for_function('window.MaterialLab&&window.ToolkitLab')
        check('Demo contains 76 individually selectable studies',page.evaluate('ToolkitLab.CATALOG.length===76'))
        page.locator('#effect-search').fill('progress');page.wait_for_timeout(30)
        check('Search filters both effect navigation and gallery',page.locator('#effect-nav button:visible').count()<15 and page.locator('#gallery .tile:visible').count()==page.locator('#effect-nav button:visible').count())
        page.locator('#effect-search').fill('');page.select_option('#effect-group','Patterns');page.wait_for_timeout(30)
        check('Category filtering retains all eight pattern studies',page.locator('#effect-nav button:visible').count()==8)
        page.select_option('#effect-group','all')
        page.evaluate('MaterialLab.select("fire")');page.wait_for_timeout(100)
        check('Fire flow, flicker, width and source position are visible controls',all(page.locator('#option-'+x).is_visible() for x in ['flameSpeed','flickerSpeed','spread','sourceOffset']))
        page.evaluate('MaterialLab.select("glow")');page.wait_for_timeout(60)
        check('Preset options have no old/new hierarchy or duplicate original keys',page.locator('#preset-select optgroup[label="original"]').count()==0 and page.locator('#preset-select option[value^="original/"]').count()==0)
        for id,key in [('lightning','branchSpread'),('spotlight','activation'),('mesh','driftSpeed'),('dots','spacing'),('progress-ring','value')]:
            page.evaluate('(id)=>MaterialLab.select(id)',id);page.wait_for_timeout(75);check(id+' exposes its relevant control',page.locator('#option-'+key).is_visible())
        page.evaluate('MaterialLab.select("dots")');page.wait_for_timeout(70)
        check('Canvas-only effects do not display meaningless GPU fallback controls',page.locator('#option-forceFallback').count()==0 and page.locator('#option-fallbackFPS').count()==0)
        page.evaluate('MaterialLab.select("mesh")');page.wait_for_timeout(400)
        page.screenshot(path=str(OUT/'p6-demo-desktop.png'))
        page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(100)
        check('Expanded demo remains within a narrow mobile viewport',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
        page.screenshot(path=str(OUT/'p6-demo-mobile.png'))
        page.close()
        selective=browser.new_page();requested=[];selective.on('pageerror',lambda e:errors.append(str(e)));selective.on('request',lambda req:requested.append(req.url));selective.route(base+'/**',serve)
        selective.set_content('<ft-pattern id=fx preset=dots style="width:600px;height:300px"></ft-pattern>')
        selective.add_script_tag(type='module',content="import * as FT from 'https://toolkit.test/dist/frontend-toolkit.loader.js';window.fixtureToolkit=FT;")
        selective.wait_for_function('fx.controller?.renderer')
        check('Selective entry loads a new family without the complete effect library',any('/effects/pattern.js' in x for x in requested) and not any('/shaders/' in x or '/effects/fire.js' in x or '/effects/backdrop.js' in x for x in requested))
        for family in ['highlight','backdrop','status']:
            selective.evaluate('f=>{fx.remove();const e=document.createElement("ft-"+f);e.id="fx";e.style.cssText="width:600px;height:300px";document.body.append(e)}',family)
            selective.wait_for_function('fx.controller?.renderer')
            check(f'Selective {family} module initializes independently',any('/effects/'+family+'.js' in x for x in requested))
        check('Shared Canvas implementation is downloaded once',sum('/core/canvas-surface.js' in x for x in requested)==1)
        check('New utility effects do not request third-party assets',all(x.startswith(base) for x in requested))
        selective.evaluate('fx.remove()');selective.wait_for_timeout(100)
        check('Selective elements release all shared frame jobs on removal',selective.evaluate('fixtureToolkit.schedulerStats().jobs===0'))
        check('No uncaught browser exceptions in Preview 6 scenarios',not errors)
        browser.close()
    (OUT/'preview6-browser-report.json').write_text(json.dumps({'checks':checks,'nativeWebGLExecution':False,'errors':errors},indent=2))
    print(f'{len(checks)} Preview 6 native-browser checks passed (Canvas pixels, inputs, caching, motion, demo and selective loading).')
if __name__=='__main__':main()
