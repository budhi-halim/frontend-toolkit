"""Public-demo integration checks using real Chromium Canvas, DOM, input and layout.

Scripts are supplied locally so top-level navigation policy does not affect tests.
This suite does not treat a Canvas fallback as hardware WebGL verification.
"""
import base64
import json
import os
from pathlib import Path
import shutil
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'tests/validation'
OUT.mkdir(exist_ok=True)
checks=[]

def check(name, condition):
    """Record the result and stop at the first reproducible regression."""
    checks.append({'name':name,'passed':bool(condition)})
    assert condition, name

def install(page):
    """Load the exact delivered public-demo scripts and styles."""
    html=(ROOT/'index.html').read_text()
    scripts=['site/theme.js','dist/frontend-toolkit.js','site/logic.js','site/ui.js']
    for file in scripts:
        html=html.replace(f'<script src="{file}" defer></script>','')
    texture='data:image/svg+xml;base64,'+base64.b64encode((ROOT/'assets/backdrop.svg').read_bytes()).decode()
    css=(ROOT/'site/style.css').read_text().replace('../assets/backdrop.svg',texture)
    html=html.replace('<link rel="stylesheet" href="site/style.css">','<style>'+css+'</style>')
    icon='data:image/svg+xml;base64,'+base64.b64encode((ROOT/'site/favicon.svg').read_bytes()).decode()
    html=html.replace('src="site/favicon.svg"',f'src="{icon}"')
    html=html.replace('<link rel="stylesheet" href="site/design.css">','<style>'+(ROOT/'site/design.css').read_text()+'</style>')
    page.set_content(html)
    for file in scripts:
        page.add_script_tag(content=(ROOT/file).read_text())
    page.wait_for_function('window.ToolkitDemo?.element?.controller')

def canvas_signature(page):
    """Read native pixels from the active renderer, not a mocked canvas."""
    return page.evaluate('''()=>{
      const c=ToolkitDemo.element.shadowRoot.querySelector('canvas');
      if(!c)return null;
      const ctx=c.getContext('2d');if(!ctx)return null;
      const d=ctx.getImageData(0,0,c.width,c.height).data;let sum=0,ink=0;
      for(let i=0;i<d.length;i+=4){sum=(sum+(d[i]+3*d[i+1]+7*d[i+2]+11*d[i+3])*(1+(i%37)))%1000000007;if(d[i+3])ink++;}
      return {sum,ink};
    }''')

def main():
    with sync_playwright() as pw:
        exe=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
        browser=pw.chromium.launch(headless=True,**({'executable_path':exe} if exe else {}))
        context=browser.new_context(viewport={'width':1440,'height':1100},reduced_motion='reduce')
        page=context.new_page();errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        install(page)
        check('Full demo motion overrides the emulated reduced preference',page.evaluate("matchMedia('(prefers-reduced-motion:reduce)').matches && ToolkitDemo.element.getStats().motionPolicy==='always'"))
        check('Actual library defaults still respect system motion',page.evaluate("FrontendToolkit.COMMON_SCHEMA.motion.default==='respect'"))
        check('Only one preview effect is attached',page.locator('#preview-mount > .effect-preview').count()==1)
        check('The advanced lab is a separate destination',page.locator('#lab-link').get_attribute('href').startswith('lab.html#lab='))
        page.locator('#stage').scroll_into_view_if_needed()
        for item in page.evaluate('ToolkitSiteModel.catalog.map(item=>({id:item.id,preset:item.preset}))'):
            page.evaluate('(id)=>ToolkitDemo.select(id)',item['id'])
            page.wait_for_timeout(95)
            check('Public demo activates '+item['id'],page.evaluate("!!ToolkitDemo.element.controller && document.querySelectorAll('#preview-mount > .effect-preview').length===1 && ToolkitDemo.element.getStats().motionPolicy==='always' && document.querySelector('#effect-error').hidden"))
        check('All public studies activated without uncaught exceptions',not errors)
        page.evaluate("ToolkitDemo.select('glow')");page.wait_for_timeout(140)
        a=canvas_signature(page);page.wait_for_timeout(280);b=canvas_signature(page)
        check('Full-motion glowing border paints changing native pixels',a and b and a['ink']>0 and a['sum']!=b['sum'])
        page.locator('#pause-button').click();page.wait_for_timeout(100)
        a=canvas_signature(page);page.wait_for_timeout(160);b=canvas_signature(page)
        check('Pause retains a stable drawn frame',a==b and page.evaluate('ToolkitDemo.element.getStats().paused'))
        page.locator('#pause-button').click();page.wait_for_timeout(120)
        check('Play resumes the preview',not page.evaluate('ToolkitDemo.element.getStats().paused'))
        page.locator('#motion-reduced').click();page.wait_for_timeout(100)
        check('Reduced preview explicitly uses never motion',page.evaluate("ToolkitDemo.element.getStats().motionPolicy==='never'"))
        check('Reduced preview disables the ambiguous play control',page.locator('#pause-button').is_disabled())
        page.evaluate("ToolkitDemo.select('fire')");page.wait_for_timeout(120)
        check('Reduced fire uses hide, not a frozen flame',page.evaluate("ToolkitDemo.element.getStats().motionPresentation==='hide' && !document.querySelector('#presentation-note').hidden"))
        page.locator('#reset-button').click();page.wait_for_timeout(80)
        check('Reset does not silently change motion policy',page.evaluate("ToolkitDemo.state.reduced && ToolkitDemo.element.getStats().motionPolicy==='never'"))
        page.locator('#motion-full').click();page.wait_for_timeout(120)
        check('Full mode remains available after reduced motion',page.evaluate("ToolkitDemo.element.getStats().motionPolicy==='always' && document.querySelector('#presentation-note').hidden"))
        page.locator('#preset').select_option('flamethrower');page.wait_for_timeout(100)
        check('Preset changes mount the requested external fire',page.evaluate("ToolkitDemo.state.preset==='flamethrower'&& ToolkitDemo.element.options.mode==='out'"))
        page.locator('#control-flameSpeed').fill('2.5');page.locator('#control-flameSpeed').dispatch_event('input');page.wait_for_timeout(100)
        check('Live slider updates the actual element options',page.evaluate('ToolkitDemo.element.options.flameSpeed===2.5'))
        check('Code export contains the changed option but not the full-motion override',page.evaluate("document.querySelector('#code-output').textContent.includes('flame-speed=\"2.5\"')&&!document.querySelector('#code-output').textContent.includes('motion=\"always\"')"))
        check('Lab link preserves modified configuration and motion mode',page.evaluate("(()=>{const d=JSON.parse(decodeURIComponent(document.querySelector('#lab-link').getAttribute('href').split('#lab=')[1]));return d.config.flameSpeed===2.5&&d.config.motion==='always';})()"))
        page.locator('#code-details').evaluate('(el)=>el.open=true')
        page.locator('[data-code="css"]').click()
        check('CSS export includes required element dimensions',page.locator('#code-output').inner_text().find('min-height: 280px')>=0)
        page.locator('#copy-code').click()
        check('Copy provides visible feedback without requiring a secure clipboard',bool(page.locator('#announcement').inner_text()))
        page.locator('#code-details').evaluate('(el)=>el.open=false')
        page.locator('#search').fill('lightning')
        check('Search narrows the effect list',page.locator('#effect-list button:visible').count()==1)
        page.locator('#search').fill('not-an-effect-abcdefghijklmnopqrstuvwxyz')
        check('An empty result is explicit',page.locator('#no-results').is_visible())
        page.locator('#clear-search').click()
        check('Filters reset without changing the active rendering mode',page.locator('#search').input_value()=='' and page.evaluate('!ToolkitDemo.state.reduced'))
        page.locator('#category').select_option('Loading & progress')
        check('Categories filter without building extra renderers',page.locator('#effect-list button:visible').count()==9 and page.locator('#preview-mount > .effect-preview').count()==1)
        page.locator('#clear-search').click()
        page.evaluate("ToolkitDemo.select('progress-ring')");page.wait_for_timeout(100)
        check('Determinate progress exposes its actual value control',page.locator('#control-value').count()==1)
        page.evaluate("ToolkitDemo.select('loading-ring')");page.wait_for_timeout(100)
        check('Indeterminate loading exposes duration rather than a false progress value',page.locator('#control-cycle').count()==1 and page.locator('#control-value').count()==0)
        page.evaluate("ToolkitDemo.select('glass')");page.wait_for_timeout(100)
        page.locator('.sample-button').click()
        check('HTML sample button retains its native click action',page.locator('#announcement').inner_text()=='Example button activated.')
        page.locator('ft-glass').focus();page.keyboard.press('ArrowRight')
        check('Keyboard can move the glass example',page.evaluate("parseFloat(ToolkitDemo.element.style.translate)>0"))
        page.keyboard.press('Home')
        check('Keyboard can reset glass position',page.evaluate("parseFloat(ToolkitDemo.element.style.translate)===0"))
        for width in [320,360,390,640,768,900,1024,1440]:
            page.set_viewport_size({'width':width,'height':1000})
            page.wait_for_timeout(100)
            check(f'Public layout stays within a {width}px viewport',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
        page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(100)
        check('Mobile effect library starts collapsed',not page.locator('#library').evaluate('(el)=>el.open'))
        page.locator('#library summary').click()
        page.locator('[data-effect="stars"]').click();page.wait_for_timeout(100)
        check('Selecting an effect closes the mobile picker',not page.locator('#library').evaluate('(el)=>el.open'))
        check('Drawing touch capture is local to the trail, not the whole page',page.evaluate("getComputedStyle(ToolkitDemo.element).touchAction==='none' && getComputedStyle(document.body).touchAction==='auto'"))
        page.locator('#stage').scroll_into_view_if_needed()
        box=page.locator('.effect-preview').bounding_box()
        page.mouse.move(box['x']+20,box['y']+80);page.mouse.move(box['x']+200,box['y']+120,steps=12);page.wait_for_timeout(100)
        check('Trail preview receives movement and paints native Canvas particles',bool(canvas_signature(page)['ink']))
        page.locator('#theme-button').click()
        check('Theme toggle works independently of motion',page.evaluate("document.documentElement.style.colorScheme==='dark' && !ToolkitDemo.state.reduced"))
        page.evaluate("ToolkitDemo.select('glow')");page.wait_for_timeout(150)
        page.screenshot(path=str(OUT/'site-mobile-dark.png'),full_page=True)
        page.locator('#theme-button').click()
        page.evaluate("ToolkitDemo.select('glass')");page.wait_for_timeout(150)
        page.screenshot(path=str(OUT/'site-mobile.png'),full_page=True)
        page.set_viewport_size({'width':1440,'height':1100});page.evaluate('window.scrollTo(0,0)');page.wait_for_timeout(200)
        page.screenshot(path=str(OUT/'site-desktop.png'),full_page=True)
        page.evaluate("ToolkitDemo.element.remove()")
        page.wait_for_timeout(200)
        check('Removing the preview releases its managed controller',page.evaluate('ToolkitDemo.element.controller===null'))
        check('No uncaught public-demo exceptions',not errors)
        context.close();browser.close()
    (OUT/'site-results.json').write_text(json.dumps(checks,indent=2))
    print(f'{len(checks)} public-demo browser checks passed (native Canvas, DOM, input and responsive layout).')

if __name__=='__main__':
    main()
