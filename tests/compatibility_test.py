"""Preview 3: real Canvas pixels, motion policies and non-secure document compatibility.

GPU-unavailable cases are forced for reproducibility, not presented as GPU tests.
"""
import json
import os
import re
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'tests/validation'
OUT.mkdir(exist_ok=True)
checks=[]


def check(name, condition):
    """Fail at the first regression while recording useful test names."""
    checks.append({'name':name, 'passed':bool(condition)})
    assert condition, name


def install(page, *, observers=True):
    """Use the real browser Canvas implementation but deliberately deny WebGL."""
    page.evaluate("""() => {
      const original=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:original.call(this,type,...args);};
    }""")
    if not observers:
        page.evaluate('window.IntersectionObserver=undefined;window.ResizeObserver=undefined')
    page.add_script_tag(content=(ROOT/'dist/frontend-toolkit.js').read_text())


def pixels(page):
    """Hash actual RGBA pixels; changes to the clock alone cannot satisfy a test."""
    return page.evaluate("""() => {
      const c=fx.controller.renderer.canvas,d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
      let hash=2166136261,opaque=0;for(let i=0;i<d.length;i++){hash=Math.imul(hash^d[i],16777619);if(i%4===3&&d[i])opaque++;}
      return {hash:hash>>>0,opaque,width:c.width,height:c.height};
    }""")


def main():
    """Exercise the specific reported failure and fallback recovery paths."""
    with sync_playwright() as p:
        exe=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
        browser=p.chromium.launch(headless=True,**({'executable_path':exe} if exe else {}))
        page=browser.new_page(viewport={'width':1000,'height':850},reduced_motion='no-preference')
        errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.set_content('<main id="mount"></main>')
        install(page)
        check('Classic bundle reports the release version', page.evaluate("FrontendToolkit.version==='1.0.0'"))
        for kind in ['water','fire','aurora','smoke','clouds','field','fluid','trail','glow']:
            page.evaluate("""kind=>{
              mount.replaceChildren();window.fx=document.createElement('ft-'+kind);
              if(kind==='trail')fx.setAttribute('trigger','auto');fx.style.cssText='display:block;position:relative;width:360px;height:200px;border-radius:25px';mount.append(fx);
            }""",kind)
            page.wait_for_function('fx.controller?.renderer')
            page.wait_for_timeout(180)
            first=pixels(page)
            page.wait_for_timeout(400)
            second=pixels(page)
            stats=page.evaluate('fx.getStats()')
            check(kind+': actual pixels animate when WebGL is unavailable',first['hash']!=second['hash'] and second['opaque']>0)
            check(kind+': clock and scheduling diagnostics agree',stats['time']>0 and stats['frames']>2 and stats['animating'] and stats['scheduled'])
        page.emulate_media(reduced_motion='reduce');page.wait_for_timeout(150)
        before=page.evaluate('fx.getStats().time');page.wait_for_timeout(200)
        check('System reduced motion pauses even the non-WebGL glow',page.evaluate('fx.getStats().time')==before and page.evaluate("fx.getStats().animationState==='reduced-motion'"))
        page.evaluate('fx.play()');page.wait_for_timeout(180)
        check('Play does not silently override accessibility preference',page.evaluate('fx.getStats().time')==before)
        page.evaluate("fx.configure({motion:'always'})");page.wait_for_timeout(260)
        check('Explicit motion override restarts the managed clock',page.evaluate('fx.getStats().time')>before)
        page.evaluate("fx.configure({forceFallback:true})");before=pixels(page);page.wait_for_timeout(200)
        check('Portable-mode toggle no longer freezes the Canvas glow',pixels(page)['hash']!=before['hash'])
        page.evaluate("fx.configure({motion:'respect'})");page.wait_for_timeout(120)
        check('Returning to respect restores reduced-motion behavior',not page.evaluate('fx.getStats().animating'))
        page.emulate_media(reduced_motion='no-preference');page.wait_for_timeout(150)
        check('Live OS preference changes resume animation',page.evaluate('fx.getStats().animating'))

        # Exercise geometry without relying on the recently added roundRect method.
        page.evaluate("Path2D.prototype.roundRect=undefined;fx.configure({paused:true,glow:50,width:8,intensity:1,bloomPlacement:'outside'})")
        page.evaluate('fx.controller.render(2)')
        center=page.evaluate("""()=>{const c=fx.controller.renderer.canvas;return [...c.getContext('2d').getImageData(c.width/2|0,c.height/2|0,1,1).data];}""")
        check('Rounded glow has a truly transparent center without Path2D.roundRect',center[3]==0)
        page.evaluate("fx.configure({shape:'ellipse'});fx.controller.render(3)")
        check('Ellipse glow also keeps the center transparent',page.evaluate("(()=>{const c=fx.controller.renderer.canvas;return c.getContext('2d').getImageData(c.width/2|0,c.height/2|0,1,1).data[3]===0;})()"))
        page.evaluate('mount.replaceChildren()');page.wait_for_timeout(120)
        check('Destroying elements releases shared frame jobs',page.evaluate('FrontendToolkit.schedulerStats().jobs===0'))

        # Reusable water source on the actual software renderer, including large host limits.
        result=page.evaluate("""async()=>{
          const r=FrontendToolkit.createWaterRenderer(mount,{forceFallback:true,tintOpacity:0,distortion:0,caustic:0});
          const source=document.createElement('canvas');source.width=source.height=4;const ctx=source.getContext('2d');ctx.fillStyle='#2468ac';ctx.fillRect(0,0,4,4);
          r.resize(360,200);await r.setSource(source);r.render(0);const before=[...r.canvas.getContext('2d').getImageData(0,0,1,1).data];
          ctx.fillStyle='#ac6824';ctx.fillRect(0,0,4,4);r.refreshSource();r.render(0);const after=[...r.canvas.getContext('2d').getImageData(0,0,1,1).data];
          r.resize(9000,6000);r.render(.2);const size=[r.canvas.width,r.canvas.height];r.destroy();r.destroy();return{before,after,size,children:mount.childElementCount};
        }""")
        check('Portable water samples the supplied image pixels exactly with optics disabled',result['before']==[36,104,172,255])
        check('Portable water refreshes edited canvas pixels',result['after']==[172,104,36,255])
        check('Portable render buffer is capped independently of a huge CSS size',max(result['size'])<=256 and result['children']==0)

        # A handled renderer error must stop cleanly and support explicit retry.
        result=page.evaluate("""async()=>{
          let construction=0,draws=0;const host=document.createElement('div');host.style.cssText='width:200px;height:100px';mount.append(host);
          window.testController=FrontendToolkit.createController(host,host,'glow',()=>{
            const generation=++construction;return{animated:true,setOptions(){},resize(){},render(){draws++;if(generation===1)throw new Error('Deliberate compatibility test fault');},destroy(){},getState(){return{backend:'Test renderer'}}};
          });await new Promise(r=>setTimeout(r,120));return testController.getStats();
        }""")
        check('Frame failure is explicit and is not left in a scheduled loop',result['animationState']=='render-error' and not result['scheduled'])
        page.evaluate('testController.retry()');page.wait_for_timeout(180)
        check('Retry renderer recovers from a frame error',page.evaluate("testController.getStats().animationState==='running'&&testController.getStats().frames>1"))
        page.evaluate('testController.destroy();mount.replaceChildren()')
        check('Capability probe explains unavailable WebGL',page.evaluate("!FrontendToolkit.probeWebGL().available&&FrontendToolkit.getDiagnostics().events.some(e=>e.code==='fallback')"))
        check('No uncaught JavaScript exceptions in the portable cases',not errors)
        page.close()

        page=browser.new_page(viewport={'width':800,'height':700})
        page.set_content('<ft-water id="fx" style="display:block;width:320px;height:180px"></ft-water>');install(page,observers=False)
        page.wait_for_timeout(500)
        check('Animation still starts without ResizeObserver or IntersectionObserver',page.evaluate('fx.getStats().animating&&fx.getStats().time>0'))
        page.evaluate("fx.style.marginTop='1100px';dispatchEvent(new Event('resize'))")
        page.wait_for_timeout(80)
        check('Observer-free resize detects when the element leaves the viewport',page.evaluate("fx.getStats().animationState==='offscreen'"))
        page.evaluate("fx.style.marginTop='0';dispatchEvent(new Event('resize'))")
        page.wait_for_timeout(180)
        check('Observer-free resize resumes a visible element',page.evaluate('fx.getStats().animating'))
        page.close()

        # An isolated about:blank document exercises APIs without a secure context.
        # This is NOT an end-to-end HTTP or ZeroTier networking test.
        context=browser.new_context(viewport={'width':1440,'height':1250},reduced_motion='reduce',accept_downloads=True)
        page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
        html=(ROOT/'lab.html').read_text()
        html=html.replace('<link rel="stylesheet" href="demo/style.css">','<style>'+(ROOT/'demo/style.css').read_text()+'</style>')
        html=re.sub(r'<script[^>]+src="(?:dist/frontend-toolkit.js|demo/(?:logic|ui).js|site/theme.js)"[^>]*></script>','',html)
        html=html.replace('<link rel="stylesheet" href="site/design.css">','<style>'+(ROOT/'site/design.css').read_text()+'</style>')
        page.set_content(html)
        install(page)
        page.add_script_tag(content=(ROOT/'demo/logic.js').read_text())
        page.add_script_tag(content=(ROOT/'demo/ui.js').read_text())
        page.wait_for_function('window.MaterialLab?.element?.controller')
        check('Isolated demo runs in a non-secure document',page.evaluate('!isSecureContext'))
        page.evaluate("MaterialLab.respectMotion();MaterialLab.select('water')");page.wait_for_timeout(150)
        check('Visible status explains why all animations are stopped','Reduced-motion' in page.locator('#runtime-label').inner_text() and page.locator('#enable-motion').is_visible())
        page.locator('#enable-motion').click();page.wait_for_timeout(400)
        check('Lab testing override produces real water motion in a non-secure document',page.evaluate('MaterialLab.element.getStats().animating&&MaterialLab.element.getStats().time>0'))
        page.evaluate("MaterialLab.select('aurora')");page.wait_for_timeout(300)
        check('Testing override follows selection changes',page.evaluate("MaterialLab.element.getStats().animating&&MaterialLab.element.options.motion==='always'"))
        check('UI explicitly labels the animated software approximation','lighter Canvas approximation' in page.locator('#runtime-detail').inner_text())
        page.locator('#diagnose-button').click()
        check('Manual diagnostics expose origin, motion policy and renderer state',page.evaluate("(()=>{const r=MaterialLab.debugReport();return !r.environment.secureContext&&r.environment.reducedMotion&&r.stats.motionPolicy==='always'&&!r.webgl.available&&r.toolkit==='1.0.0';})()"))
        with page.expect_download() as download_info:
            page.locator('#download-report').click()
        report=json.loads(Path(download_info.value.path()).read_text())
        check('Diagnostic report can be saved without the secure clipboard API',report['toolkit']=='1.0.0' and 'diagnostics' in report)
        page.locator('#respect-motion').click();page.wait_for_timeout(150)
        check('Use system preference removes the testing override',page.evaluate("!MaterialLab.element.getStats().animating&&MaterialLab.element.options.motion==='respect'"))
        page.evaluate("MaterialLab.select('wood')");page.locator('#preset-select').select_option('wood/quarter-sawn-oak');page.wait_for_timeout(700)
        check('Wood anatomy and cut controls are exposed in the inspector',page.locator('#option-woodSpecies').is_visible() and page.locator('#option-woodCut').input_value()=='quarter-sawn')
        page.screenshot(path=str(OUT/'preview3-desktop.png'))
        page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(250)
        check('Compatibility panel and new controls fit a phone viewport',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
        page.screenshot(path=str(OUT/'preview3-mobile.png'))
        check('Demo workflow has no uncaught JavaScript errors',not errors)
        context.close();browser.close()
    (OUT/'compatibility-report.json').write_text(json.dumps({'mode':'Chromium with unavailable WebGL; actual Canvas pixel rendering, not GPU execution','passed':len(checks),'checks':checks},indent=2))
    print(f'{len(checks)} compatibility checks passed (real Canvas rendering).')


if __name__=='__main__':
    main()
