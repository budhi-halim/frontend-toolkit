"""Native Chromium checks. WebGL fallback checks are not GPU rendering tests."""
import json
import os
import shutil
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'tests/validation'
OUT.mkdir(exist_ok=True)
results=[]

def check(name,condition):
    """Record a check and fail at the first regression."""
    results.append({'name':name,'passed':bool(condition)})
    if os.environ.get('VERBOSE_TESTS'): print(name, bool(condition), flush=True)
    assert condition,name

def bundle(page):
    """Install the built classic entry without a network dependency."""
    page.add_script_tag(content=(ROOT/'dist/frontend-toolkit.js').read_text())

def demo(page):
    """Install the demo in an isolated document for restricted CI environments."""
    html=(ROOT/'lab.html').read_text()
    for f in ['site/theme.js','dist/frontend-toolkit.js','demo/logic.js','demo/ui.js']:
        html=html.replace(f'<script src="{f}" defer></script>','')
    html=html.replace('<link rel="stylesheet" href="demo/style.css">','<style>'+(ROOT/'demo/style.css').read_text()+'</style>')
    html=html.replace('<link rel="stylesheet" href="site/design.css">','<style>'+(ROOT/'site/design.css').read_text()+'</style>')
    page.set_content(html)
    for f in ['site/theme.js','dist/frontend-toolkit.js','demo/logic.js','demo/ui.js']:
        page.add_script_tag(content=(ROOT/f).read_text())
    page.wait_for_function('window.MaterialLab && MaterialLab.element.controller')

def main():
    """Exercise visuals, interaction, cleanup, isolated capture, and native ESM loading."""
    with sync_playwright() as p:
        exe=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
        browser=p.chromium.launch(headless=True,**({'executable_path':exe} if exe else {}))
        page=browser.new_page(viewport={'width':1440,'height':1080})
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        demo(page)
        check('One demo exposes 76 studies',page.evaluate('ToolkitLab.CATALOG.length===76'))
        for item in page.evaluate('ToolkitLab.CATALOG.map(x=>x.id)'):
            page.evaluate('(id)=>MaterialLab.select(id)',item)
            page.wait_for_timeout(90)
            check('Demo activates '+item,page.evaluate("!!MaterialLab.element.controller && MaterialLab.element.getStats().backend!=='Waiting for visibility'"))
        page.evaluate("MaterialLab.select('glass')")
        page.wait_for_timeout(250)
        check('Desktop has no horizontal page overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
        page.screenshot(path=str(OUT/'desktop.png'))
        page.set_viewport_size({'width':390,'height':844})
        page.wait_for_timeout(350)
        check('Mobile has no horizontal page overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
        page.screenshot(path=str(OUT/'mobile.png'))
        check('Demo generated no uncaught errors',not errors)
        page.close()

        page=browser.new_page(viewport={'width':1000,'height':800})
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content('<div id="bounds" style="position:relative;width:700px;height:500px;padding:0"><ft-glass id="glass" drag-enabled="true" style="position:absolute;left:150px;top:100px;width:300px;height:180px;border-radius:30px"><button id="button">Interact</button></ft-glass></div>')
        bundle(page)
        page.wait_for_function('glass.controller?.renderer')
        box=page.locator('#glass').bounding_box()
        page.mouse.move(box['x']+100,box['y']+90)
        page.mouse.down();page.mouse.move(box['x']+205,box['y']+135,steps=8);page.mouse.up()
        moved=page.locator('#glass').bounding_box()
        check('Glass drag updates its actual screen position',abs(moved['x']-box['x']-105)<2 and abs(moved['y']-box['y']-45)<2)
        page.locator('#glass').focus();page.keyboard.press('Home')
        check('Home recenters draggable element',page.evaluate("glass.style.translate.split(' ').every(x=>parseFloat(x)===0)"))
        page.keyboard.press('ArrowRight')
        check('Keyboard arrows move draggable element',page.evaluate("parseFloat(glass.style.translate)>0"))
        page.keyboard.press('Home')
        button=page.locator('#button').bounding_box()
        page.mouse.move(button['x']+10,button['y']+10);page.mouse.down();page.mouse.move(button['x']+100,button['y']+50);page.mouse.up()
        check('Controls inside glass do not initiate dragging',page.evaluate("glass.style.translate.split(' ').every(x=>parseFloat(x)===0)"))
        page.mouse.move(box['x']+100,box['y']+90);page.mouse.down();page.mouse.move(970,750,steps=5);page.mouse.up()
        check('Drag is constrained to parent bounds',page.evaluate('(()=>{const r=glass.getBoundingClientRect(),b=bounds.getBoundingClientRect();return r.right<=b.right+.5&&r.bottom<=b.bottom+.5;})()'))
        page.evaluate("glass.configure({dragEnabled:false})")
        check('Disabling dragging restores original inline styles',page.evaluate("glass.style.translate==='' && !glass.hasAttribute('tabindex')"))
        page.evaluate("glass.remove();bounds.remove();document.body.style.margin='0'")

        data=page.evaluate('''async()=>{
          const ft=FrontendToolkit,m=document.createElement('div');Object.assign(m.style,{position:'relative',width:'360px',height:'200px',borderRadius:'34px'});document.body.append(m);
          const r=ft.createGlowRenderer(m,{width:6,glow:40,intensity:1,bloomPlacement:'outside',quality:1,dprCap:1});r.resize(360,200);r.render(.4);
          const c=r.canvas,ctx=c.getContext('2d'),center=ctx.getImageData(c.width/2,c.height/2,1,1).data[3],pix=ctx.getImageData(0,0,c.width,c.height).data;
          const ink=pix.some((v,i)=>i%4===3&&v>0);const stats=r.getState();r.setOptions({width:0});r.render(.8);const blank=!ctx.getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0);
          r.destroy();m.remove();return{center,ink,blank,stats};
        }''')
        check('Glow interior remains alpha-zero with maximum outer bloom',data['center']==0 and data['ink'])
        check('Zero border width clears the border and bloom',data['blank'])
        check('Glow reports perimeter and constant linear speed',data['stats']['perimeterPixels']>500 and data['stats']['linearSpeed']>0)

        for kind in ['stars','flowers','petals','smoke','embers','bubbles','fireflies','snow','ribbons','comet','confetti']:
            data=page.evaluate('''kind=>{
              const m=document.createElement('div');document.body.append(m);const r=FrontendToolkit.createTrailRenderer(m,{kind,autoEmit:true});r.resize(400,250);for(let i=0;i<40;i++)r.render(i/60);const count=r.getState().particles,c=r.canvas,ink=c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0);r.clear();const clear=r.getState().particles===0;r.destroy();r.destroy();const removed=m.children.length===0;m.remove();return{count,ink,clear,removed};
            }''',kind)
            check(kind+' brush draws particles, clears, and destroys',data['count']>0 and data['ink'] and data['clear'] and data['removed'])

        page.evaluate("document.body.innerHTML='<ft-trail id=trail auto-emit=false style=\"width:400px;height:250px\"></ft-trail>'")
        page.wait_for_function('trail.controller?.renderer')
        page.wait_for_timeout(100)
        check('Idle manual brush does not keep a RAF job alive',page.evaluate('FrontendToolkit.schedulerStats().jobs===0'))
        page.mouse.move(20,20);page.mouse.move(210,130,steps=20);page.wait_for_timeout(120)
        check('Pointer wakes an idle manual brush',page.evaluate('trail.getStats().particles>0'))
        page.emulate_media(reduced_motion='reduce');page.wait_for_timeout(150)
        check('Reduced-motion preference stops continuous animation',page.evaluate('trail.getStats().reducedMotion && !trail.getStats().animating'))
        before=page.evaluate('trail.getStats().time');page.evaluate('trail.step(.2)')
        check('Paused single-step still advances the clock',page.evaluate('trail.getStats().time')>before)
        page.evaluate('trail.remove()');page.wait_for_timeout(80)
        check('Removing last custom element releases RAF job',page.evaluate('FrontendToolkit.schedulerStats().jobs===0'))
        page.emulate_media(reduced_motion='no-preference')
        page.evaluate("document.body.innerHTML='<ft-glow id=slow fps=2 style=\"width:300px;height:160px\"></ft-glow>'")
        page.wait_for_function('slow.controller?.renderer');page.wait_for_timeout(760)
        check('Intentional two-FPS cap still advances animation time',page.evaluate('slow.getStats().time>.35'))
        page.evaluate('slow.remove()')

        data=page.evaluate('''()=>{const m=document.createElement('div');document.body.append(m);const r=FrontendToolkit.createFluidRenderer(m,{forceFallback:true,autoEmit:false,kind:'smoke'});r.resize(400,240);r.setPointer({x:.5,y:.2,dx:.12,dy:.1,down:true,active:true});for(let i=0;i<20;i++)r.render(i/60);const c=r.canvas,ink=c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0),state=r.getState();r.clear();r.render(1);const cleared=!c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0);r.destroy();const removed=m.children.length===0;m.remove();return{ink,cleared,removed,state};}''')
        check('Portable fluid advects injected smoke and reports its grid',data['ink'] and data['state']['simulationGrid']!='')
        check('Portable fluid can be cleared and disposed',data['cleared'] and data['removed'])

        page.set_content('<style>#source{width:320px;height:160px;padding:20px;background:linear-gradient(120deg,oklch(.8 .1 170),oklch(.5 .15 210));color:oklch(.97 .02 90)}h1{font:32px Georgia}</style><div id="source"><h1>Capture test</h1><p>Live HTML remains intact.</p></div>')
        bundle(page)
        data=page.evaluate('''async()=>{const html=source.outerHTML,styles=document.querySelector('style').textContent,c=await FrontendToolkit.captureDOM(source),ink=c.getContext('2d').getImageData(30,30,1,1).data[3];return{size:[c.width,c.height],ink,unchanged:html===source.outerHTML&&styles===document.querySelector('style').textContent,frames:document.querySelectorAll('[data-ft-capture]').length};}''')
        check('Native DOM capture renders CSS-modern-color sample',data['size']==[360,200] and data['ink']>0)
        check('Snapshot leaves original markup/styles untouched and removes staging',data['unchanged'] and data['frames']==0)
        data=page.evaluate('''async()=>{let message='';try{await FrontendToolkit.captureDOM(source,{renderer:async()=>{throw new Error('Intentional engine failure')}});}catch(e){message=e.message;}return{message,frames:document.querySelectorAll('[data-ft-capture]').length};}''')
        check('Snapshot engine failure cleans staging and propagates error','Intentional' in data['message'] and data['frames']==0)
        data=page.evaluate('''async()=>{const ac=new AbortController();setTimeout(()=>ac.abort(),80);let name='';try{await FrontendToolkit.captureDOM(source,{signal:ac.signal,renderer:()=>new Promise(()=>{})});}catch(e){name=e.name;}return{name,frames:document.querySelectorAll('[data-ft-capture]').length};}''')
        check('Aborted snapshot releases queue and staging',data['name']=='AbortError' and data['frames']==0)
        check('Native capture still works after failed/aborted work',page.evaluate('FrontendToolkit.captureDOM(source).then(c=>c.width===360)'))
        page.close()

        page=browser.new_page(viewport={'width':800,'height':600})
        requests=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        def serve(route):
            """Serve actual ES modules through an offline HTTPS fixture."""
            path=urlparse(route.request.url).path.lstrip('/');requests.append(path)
            f=(ROOT/path).resolve()
            if f.is_file() and f.is_relative_to(ROOT):
                route.fulfill(status=200,body=f.read_text(),headers={'Content-Type':'text/javascript','Access-Control-Allow-Origin':'*'})
            else:route.fulfill(status=404,body='missing')
        page.route('https://toolkit.test/**',serve)
        page.set_content('<ft-glass id=g loading=manual style="width:300px;height:180px"></ft-glass><ft-fire id=f loading=manual style="width:300px;height:180px"></ft-fire>')
        page.add_script_tag(type='module',content="import * as m from 'https://toolkit.test/dist/frontend-toolkit.loader.js';window.ft=m;")
        page.wait_for_function('window.ft')
        check('Selective entry does not fetch renderer or shader payloads',not any('/effects/' in x or '/shaders/' in x or 'liquid-map' in x for x in requests))
        page.evaluate('Promise.all([g.load(),g.load()])');page.wait_for_function('g.controller?.renderer')
        check('Concurrent activation downloads glass exactly once',requests.count('dist/modules/effects/glass.js')==1 and requests.count('dist/modules/assets/liquid-map.js')==1)
        check('Loading glass leaves fire module undownloaded','dist/modules/effects/fire.js' not in requests)
        page.evaluate("ft.preload(['fire'],{when:'idle'})")
        check('Idle preload fetches requested effect','dist/modules/effects/fire.js' in requests)
        check('Preloading does not activate manual elements',page.evaluate('!f.controller'))
        page.evaluate('f.load()');page.wait_for_function('f.controller?.renderer')
        check('Manual activation reuses preloaded effect',requests.count('dist/modules/effects/fire.js')==1)
        page.evaluate("document.body.insertAdjacentHTML('beforeend','<ft-smoke id=s loading=visible style=\"position:absolute;top:3000px;width:300px;height:180px\"></ft-smoke>')")
        page.wait_for_timeout(150)
        check('Invisible effect is not downloaded before its threshold','dist/modules/effects/smoke.js' not in requests)
        page.evaluate('s.scrollIntoView()');page.wait_for_function('s.controller?.renderer')
        check('Approaching visibility downloads the effect','dist/modules/effects/smoke.js' in requests)
        page.evaluate("window.IntersectionObserver=undefined;document.body.innerHTML='<ft-water id=w loading=visible style=\"width:300px;height:180px\"></ft-water>';scrollTo(0,0)")
        page.wait_for_function('w.controller?.renderer')
        check('Selective visible loading initializes safely when IntersectionObserver is absent','dist/modules/effects/water.js' in requests)
        page.evaluate("ft.preload(['sea'],{when:'now'})")
        check('Selective sea loading fetches its renderer and shader','dist/modules/effects/sea.js' in requests and 'dist/modules/shaders/sea.js' in requests)
        check('Loading sea does not download unrelated shader art or vector studies','dist/modules/effects/art.js' not in requests and 'dist/modules/effects/sketch.js' not in requests)
        page.evaluate("ft.preload(['art','sketch'],{when:'now'})")
        check('New families participate in deduplicated preloading',requests.count('dist/modules/effects/art.js')==1 and requests.count('dist/modules/effects/sketch.js')==1)
        page.evaluate('document.body.replaceChildren()');page.wait_for_timeout(80)
        check('Selective teardown leaves no animation jobs',page.evaluate('ft.schedulerStats().jobs===0'))
        check('Full browser suite has no uncaught errors',not errors)
        browser.close()
    report={'mode':'Native Chromium; GPU effects use fallback when WebGL is unavailable. Native ESM modules served through offline HTTPS fixture.','passed':len(results),'checks':results,'uncaughtErrors':errors}
    (OUT/'browser-report.json').write_text(json.dumps(report,indent=2))
    print(f'{len(results)} native browser checks passed.')

if __name__=='__main__':
    main()
