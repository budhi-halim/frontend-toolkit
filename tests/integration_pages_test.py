"""Exercise the delivered examples and static documentation via routed local files."""
import json
import mimetypes
import os
from pathlib import Path
import re
import shutil
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'tests/validation';OUT.mkdir(exist_ok=True)
checks=[]
def check(name,condition):
    checks.append({'name':name,'passed':bool(condition)})
    assert condition,name

def main():
    with sync_playwright() as p:
        exe=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
        browser=p.chromium.launch(headless=True,**({'executable_path':exe} if exe else {}))
        errors=[];requests=[]
        def route_files(route):
            target=(ROOT/urlparse(route.request.url).path.lstrip('/')).resolve()
            requests.append(route.request.url)
            if target.is_relative_to(ROOT) and target.is_file():
                route.fulfill(status=200,body=target.read_bytes(),headers={'Content-Type':mimetypes.guess_type(target)[0] or 'application/octet-stream','Access-Control-Allow-Origin':'*'})
            else:route.fulfill(status=404,body='Not found')
        def load(file,reduced='no-preference',width=1150):
            page=browser.new_page(viewport={'width':width,'height':900},reduced_motion=reduced)
            page.on('pageerror',lambda error:errors.append(str(error)))
            page.route('https://toolkit.test/**',route_files)
            base='https://toolkit.test/'+str(Path(file).parent).replace('\\','/')+'/'
            page.set_content((ROOT/file).read_text().replace('<head>','<head><base href="'+base+'">'))
            return page
        page=load('examples/classic.html')
        page.wait_for_function("document.querySelector('ft-glow')?.controller?.renderer")
        check('Classic example registers and paints',page.locator('ft-glow').count()==1)
        check('Classic example does not force full motion',page.evaluate("document.querySelector('ft-glow').options.motion==='respect'"))
        check('Classic example has explicit linear speed mode',page.evaluate("document.querySelector('ft-glow').options.speedMode==='pixels'"))
        page.close()
        requests.clear();page=load('examples/selective.html',reduced='reduce')
        page.wait_for_function("customElements.get('ft-fire') && document.querySelector('ft-glow').controller?.renderer")
        check('Selective example does not fetch the manual fire module early',not any('/effects/fire.js' in s for s in requests))
        page.locator('#activate').click();page.wait_for_function("document.querySelector('#load-state').textContent.includes('is loaded')")
        check('Selective example uses the working element load API',any('/effects/fire.js' in s for s in requests))
        check('Explicit loading still respects reduced motion',page.evaluate("document.querySelector('#manual-fire').getStats().motionPresentation==='hide'"))
        check('Selective example does not request the complete classic bundle',not any(s.endswith('/dist/frontend-toolkit.js') for s in requests))
        page.close()
        page=load('examples/managed.html');page.wait_for_selector('[data-ft-layer="highlight"]',state='attached')
        page.locator('#action').click()
        check('Managed effect leaves the actual button action intact','1 time.' in page.locator('#result').inner_text())
        page.locator('#toggle').click()
        check('Managed effect teardown removes its layer',page.locator('[data-ft-layer]').count()==0)
        page.locator('#action').focus();page.keyboard.press('Enter')
        check('Button works by keyboard after effect teardown','2 times.' in page.locator('#result').inner_text())
        page.locator('#toggle').click()
        check('Managed effect can be attached again',page.locator('[data-ft-layer]').count()==1)
        page.close()
        for file in ['docs/guide.html','docs/api.html','docs/reference.html','docs/compatibility.html','docs/accessibility.html']:
            page=load(file,width=390)
            page.wait_for_timeout(120)
            check(file+' is usable without horizontal page overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
            check(file+' contains a heading and navigation',page.locator('h1').count()==1 and page.locator('.docs-nav').count()==1)
            if file.endswith('reference.html'):
                check('Option reference groups the 19 families instead of opening every table',page.locator('details.reference-section').count()==19 and page.locator('details[open]').count()==0)
                page.locator('.reference-index a[href="#fire"]').click();page.wait_for_timeout(100)
                check('Reference fragment opens its collapsed effect section',page.locator('#fire').evaluate('(el)=>el.open'))
                check('Reference lists the actual CSS variable form','--ft-flame-speed' in page.locator('article').inner_text())
                page.screenshot(path=str(OUT/'reference-mobile.png'))
            page.close()
        check('Integration and documentation pages have no uncaught browser exceptions',not errors)
        browser.close()
    (OUT/'integration-pages-results.json').write_text(json.dumps(checks,indent=2))
    print(f'{len(checks)} example/documentation browser checks passed.')
if __name__=='__main__':main()
