"""Native Canvas/layout regression tests for falling particles and status fixes.

Uses locally supplied pages in restricted environments; no WebGL stub is involved.
If a production website is built, its minified assets are used for the public demo.
"""
import base64
import json
import mimetypes
import os
from pathlib import Path
import re
import shutil
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'tests/validation'
OUT.mkdir(exist_ok=True)
SITE = ROOT / 'build/site' if (ROOT / 'build/site/index.html').exists() else ROOT
checks = []


def check(name, condition):
    """Record a regression check and stop on failure."""
    checks.append({'name': name, 'passed': bool(condition)})
    assert condition, name


def install_demo(page):
    """Supply exact built JS/CSS bytes without a top-level network navigation."""
    text = (SITE / 'index.html').read_text()
    scripts = ['site/theme.js', 'dist/frontend-toolkit.js', 'site/logic.js', 'site/ui.js']
    for file in scripts:
        text = re.sub(r'<script\b[^>]*\bsrc=[\'"]' + re.escape(file) + r'[\'"][^>]*>\s*</script>', '', text)
    image = 'data:image/svg+xml;base64,' + base64.b64encode((SITE / 'assets/backdrop.svg').read_bytes()).decode()
    for file in ['site/style.css', 'site/design.css']:
        css = (SITE / file).read_text().replace('../assets/backdrop.svg', image)
        text = re.sub(r'<link\b[^>]*\bhref=[\'"]' + re.escape(file) + r'[\'"][^>]*>', lambda _: '<style>' + css + '</style>', text)
    text = text.replace('src="site/favicon.svg"', 'src="data:image/svg+xml;base64,' + base64.b64encode((SITE / 'site/favicon.svg').read_bytes()).decode() + '"')
    page.set_content(text)
    for file in scripts:
        page.add_script_tag(content=(SITE / file).read_text())
    page.wait_for_function('window.ToolkitDemo?.element?.controller')


def main():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
        page = browser.new_page(viewport={'width': 1200, 'height': 900}, reduced_motion='no-preference')
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.set_content('<style>body{margin:0;background:#112129}#mount{position:relative;width:760px;height:350px;border-radius:20px}</style><div id="mount"></div>')
        page.add_script_tag(content=(ROOT / 'dist/frontend-toolkit.js').read_text())
        page.evaluate('''()=>{
          const FT=FrontendToolkit;window.r=null;
          window.make=(effect,preset,patch={})=>{r?.destroy();mount.replaceChildren();r=FT['create'+effect[0].toUpperCase()+effect.slice(1)+'Renderer'](mount,{...FT.getDefaults(effect,preset),quality:1,dprCap:1,adaptive:false,...patch});r.resize(760,350);r.render(0);return r;};
          window.signature=canvas=>{const p=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let hash=2166136261,ink=0;for(let i=0;i<p.length;i++){hash=Math.imul(hash^p[i],16777619);if(i%4===3&&p[i])ink++;}return {hash:hash>>>0,ink};};
        }''')
        for preset in page.evaluate('Object.keys(FrontendToolkit.PRESETS.fall)'):
            result = page.evaluate('''preset=>{make('fall',preset);const a=signature(r.canvas);r.render(1.2);const b=signature(r.canvas);return{a,b,state:r.getState()};}''', preset)
            check(preset + ': paints visible particles', result['a']['ink'] > 30)
            check(preset + ': motion changes actual pixels', result['a']['hash'] != result['b']['hash'])
            check(preset + ': reuses bounded sprite cache', result['state']['spriteBuilds'] == 1 and 1 <= result['state']['spriteCount'] <= 9)
            page.locator('#mount').screenshot(path=str(OUT / ('fall-' + preset + '.png')))
        results = page.evaluate('''()=>{
          const results=[],check=(name,ok)=>{results.push({name,passed:!!ok});if(!ok)throw Error(name);};
          make('fall','autumn-leaves');const a=signature(r.canvas),count=r.getState().spriteBuilds;r.render(0);check('Redrawing the same time is stable',signature(r.canvas).hash===a.hash);
          r.setOptions({wind:75,fallSpeed:90,density:30});r.render(1);check('Velocity and density do not rebuild sprites',r.getState().spriteBuilds===count);
          r.setOptions({color:'#49aed1'});r.render(1);check('Changing color rebuilds the sprite cache once',r.getState().spriteBuilds===count+1);
          r.setOptions({kind:'snow',shape:'flake',colorMode:'single'});r.render(1);check('Switching material and palette produces one matching sprite',r.getState().kind==='snow'&&r.getState().shape==='flake'&&r.getState().spriteCount===1);
          r.setOptions({fallSpeed:0,wind:0,gust:0,swaySpeed:0,tumble:0});r.render(2);const still=signature(r.canvas);r.render(3);check('Explicitly still configuration sleeps without changing pixels',!r.animated&&signature(r.canvas).hash===still.hash);
          r.setOptions({density:0});r.render(3);check('Zero-density overlay clears and sleeps',!r.animated&&r.getState().particleCount===0&&signature(r.canvas).ink===0);
          r.setOptions({density:120,maxParticles:47});r.resize(20000,8000);r.render(3);check('Large falling surfaces obey both pixel and particle caps',r.canvas.width<=2048&&r.canvas.height<=2048&&r.canvas.width*r.canvas.height<=1400000&&r.getState().particleCount<=47);
          const old=r.canvas;r.destroy();check('Destroy releases the canvas and sprite cache',!old.isConnected&&old.width===1&&r.getState().spriteCount===0&&r.getState().particleCount===0);
          for(const preset of ['progress-ring','loading-ring']){
            make('status',preset,{anchorX:.5,anchorY:.5,value:0,indeterminate:false});
            const o=FrontendToolkit.getDefaults('status',preset),ctx=r.canvas.getContext('2d'),radius=o.size/2-o.thickness/2;
            let closed=true;for(let deg=0;deg<360;deg+=5){const a=deg*Math.PI/180,x=Math.round(380+radius*Math.cos(a)),y=Math.round(175+radius*Math.sin(a));if(!ctx.getImageData(x-1,y-1,3,3).data.some((v,i)=>i%4===3&&v>100))closed=false;}
            check(preset+': complete 360-degree track, including former gap',closed&&r.getState().value===0);
          }
          make('status','progress-ring',{anchorX:.5,anchorY:.5});check('Full track does not falsify actual progress',r.getState().value===.72);
          make('status','loading-ring',{anchorX:.5,anchorY:.5});const before=signature(r.canvas);r.render(.6);check('Circular loading indicator retains animated highlight',r.animated&&signature(r.canvas).hash!==before.hash);
          return results;
        }''')
        checks.extend(results)
        page.evaluate("make('status','avatar-placeholder',{anchorX:.5,anchorY:.5,shimmer:false,width:.7})")
        page.locator('#mount').screenshot(path=str(OUT / 'profile-layout.png'))
        # Validate the actual profile pixels, not only the pure layout helper.
        boxes = page.evaluate('''()=>{
          const c=r.canvas,d=c.getContext('2d').getImageData(0,0,c.width,c.height).data,seen=new Uint8Array(c.width*c.height),result=[];
          for(let n=0;n<seen.length;n++){if(seen[n]||!d[n*4+3])continue;const queue=[n];seen[n]=1;let minX=c.width,maxX=0,minY=c.height,maxY=0;
            for(let i=0;i<queue.length;i++){const k=queue[i],x=k%c.width,y=Math.floor(k/c.width);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
              for(const j of [x? k-1:-1,x<c.width-1?k+1:-1,y?k-c.width:-1,y<c.height-1?k+c.width:-1])if(j>=0&&!seen[j]&&d[j*4+3]){seen[j]=1;queue.push(j);}}
            result.push({x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1});}
          return result;
        }''')
        avatar = max(boxes, key=lambda b: b['h'])
        bars = sorted([b for b in boxes if b != avatar], key=lambda b: b['y'])
        check('Profile paints one avatar and three separate text bars', len(boxes) == 4 and len(bars) == 3)
        check('Every profile bar is right of the avatar with matching gaps', len({b['x'] for b in bars}) == 1 and bars[0]['x'] >= avatar['x'] + avatar['w'] + 9 and bars[1]['y'] - bars[0]['y'] - bars[0]['h'] == bars[2]['y'] - bars[1]['y'] - bars[1]['h'])
        page.close()
        page = browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce')
        page.on('pageerror', lambda e: errors.append(str(e)))
        install_demo(page)
        for width in [320,390,768,1440]:
            page.set_viewport_size({'width':width,'height':1000})
            for study in ['mesh','bokeh','sunbeams','grid','spotlight']:
                # IDs are stable catalog identifiers, not preset labels.
                identifier = page.evaluate('''name=>ToolkitSiteModel.catalog.find(i=>i.preset===name)?.id''', study)
                page.evaluate('(id)=>ToolkitDemo.select(id)',identifier)
                page.locator('#stage').scroll_into_view_if_needed()
                page.wait_for_timeout(60)
                layout = page.evaluate('''()=>{
                  const s=document.querySelector('#stage').getBoundingClientRect(),c=document.querySelector('.example-card').getBoundingClientRect();
                  return {cx:Math.abs(c.x+c.width/2-s.x-s.width/2),cy:Math.abs(c.y+c.height/2-s.y-s.height/2),inside:c.top>=s.top-1&&c.bottom<=s.bottom+1,overflow:document.documentElement.scrollWidth>innerWidth+1};
                }''')
                check(f'{study} at {width}px: centered, fully visible card', layout['cx'] < 1 and layout['cy'] < 1 and layout['inside'])
                check(f'{study} at {width}px: no page overflow', not layout['overflow'])
            if width in [390,1440]:
                page.evaluate("ToolkitDemo.select(ToolkitSiteModel.catalog.find(i=>i.preset==='bokeh').id)")
                page.locator('#stage').screenshot(path=str(OUT / f'centered-bokeh-{width}.png'))
        page.set_viewport_size({'width':1100,'height':950})
        for identifier in ['snowfall','autumn-leaves','falling-petals','drifting-seeds']:
            page.evaluate('(id)=>ToolkitDemo.select(id)',identifier)
            page.locator('#stage').scroll_into_view_if_needed()
            page.wait_for_function("ToolkitDemo.element.controller?.renderer?.getState().particleCount>0")
            check(identifier + ': public full motion despite reduced system', page.evaluate("ToolkitDemo.element.options.motion==='always'&&ToolkitDemo.element.getStats().animating"))
            check(identifier + ': only material-specific shapes offered', page.evaluate("Array.from(document.querySelector('#control-shape').options).every(o=>FrontendToolkit.SCHEMAS.fall.shape.valuesByKind[ToolkitDemo.element.options.kind].includes(o.value))"))
            check(identifier + ': native touch panning retained',page.evaluate("getComputedStyle(ToolkitDemo.element).touchAction==='auto'"))
            page.locator('#motion-reduced').click()
            page.wait_for_timeout(60)
            check(identifier + ': reduced mode hides decoration and stops rendering',page.evaluate("ToolkitDemo.element.getStats().motionPresentation==='hide'&&!ToolkitDemo.element.getStats().animating"))
            page.locator('#motion-full').click()
            page.wait_for_timeout(70)
            check(identifier + ': full mode can recreate released decoration',page.evaluate("ToolkitDemo.element.controller.renderer?.getState().particleCount>0"))
        # Inspect the advanced link generated by the public demo.
        page.evaluate("ToolkitDemo.select('snowfall')")
        check('Full settings link carries the new study and shape',page.evaluate("JSON.parse(decodeURIComponent(document.querySelector('#lab-link').getAttribute('href').split('#lab=')[1])).id==='snowfall'"))
        page.close()
        # Selective loading reads the generated module tree, without fetching GPU effects.
        page=browser.new_page(reduced_motion='no-preference')
        page.on('pageerror',lambda e:errors.append(str(e)))
        requested=[]
        def route_local(route):
            path=urlparse(route.request.url).path.lstrip('/')
            requested.append(path)
            file=(ROOT/path).resolve()
            if file.is_relative_to(ROOT) and file.is_file():
                route.fulfill(body=file.read_bytes(),headers={'Content-Type':mimetypes.guess_type(file)[0] or 'application/octet-stream','Access-Control-Allow-Origin':'*'})
            else: route.fulfill(status=404,body='Not found')
        page.route('https://toolkit.test/**',route_local)
        page.set_content('<style>ft-fall{display:block;width:600px;height:300px}</style><ft-fall id="falling" preset="snowflakes" loading="manual"><button>Native button</button></ft-fall><script type="module" src="https://toolkit.test/dist/frontend-toolkit.loader.js"></script>')
        page.wait_for_function("!!customElements.get('ft-fall')")
        check('Manual falling element does not fetch renderer early', not any(p.endswith('/effects/fall.js') for p in requested))
        page.evaluate("document.querySelector('ft-fall').load()")
        page.wait_for_function("document.querySelector('ft-fall').controller?.renderer?.getState().particleCount>0")
        check('Manual falling activation loads exactly one renderer module',sum(p.endswith('/effects/fall.js') for p in requested)==1)
        check('Selective falling activation does not download unrelated GPU renderers',not any('/effects/'+name+'.js' in p for p in requested for name in ['fire','water','aurora','sea','fluid']))
        page.emulate_media(reduced_motion='reduce')
        page.wait_for_timeout(70)
        check('Library respects system reduction but keeps HTML content',page.evaluate("document.querySelector('ft-fall').getStats().motionPresentation==='hide'&&document.querySelector('ft-fall button').getBoundingClientRect().height>0"))
        page.emulate_media(reduced_motion='no-preference')
        page.wait_for_timeout(70)
        page.evaluate("document.querySelector('ft-fall').remove()")
        page.wait_for_timeout(60)
        # Importing just the shared scheduler verifies lifecycle cleanup without loading all renderers.
        check('Removing the falling element clears shared frame jobs',page.evaluate("async()=>{const m=await import('https://toolkit.test/dist/modules/core/scheduler.js');return m.schedulerStats().jobs===0;}"))
        check('No uncaught exceptions across new effects and demo checks',not errors)
        browser.close()
    (OUT/'falling-results.json').write_text(json.dumps({'checks':checks,'distribution':json.loads((ROOT/'dist/manifest.json').read_text())['mode'],'topLevelNavigation':False},indent=2))
    print(f'{len(checks)} falling/status/layout browser checks passed using native Canvas.')


if __name__=='__main__':
    main()
