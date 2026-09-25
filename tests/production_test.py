"""Check the actual built site over local HTTP, including its isolated worker.

Default mode requires real production output. --preview is an explicitly labelled
preparation-only run; it does not establish that the minifier has been tested.
"""
import json
import os
from pathlib import Path
import queue
import shutil
import subprocess
import sys
import threading
import mimetypes
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'tests/validation'
OUT.mkdir(exist_ok=True)
results = []


def check(name, condition):
    """Record a check and fail immediately on a reproducible regression."""
    results.append({'name': name, 'passed': bool(condition)})
    assert condition, name


def main():
    manifest = json.loads((ROOT / 'build/site/dist/manifest.json').read_text())
    isolated = '--isolated' in sys.argv
    if manifest['mode'] != 'production' and '--preview' not in sys.argv:
        raise SystemExit('Production build required. Run npm run build; --preview only tests the readable preparation build.')
    server = subprocess.Popen([shutil.which('node') or 'node', 'scripts/serve.mjs', '--built'], cwd=ROOT,
                              env={**os.environ, 'PORT': '0', 'HOST': '127.0.0.1'}, stdout=subprocess.PIPE,
                              stderr=subprocess.STDOUT, text=True)
    lines = queue.Queue()
    threading.Thread(target=lambda: [lines.put(line) for line in server.stdout], daemon=True).start()
    try:
        base = lines.get(timeout=15).strip().split('http://', 1)[1]
        base = 'http://' + base.replace('localhost', '127.0.0.1')
        if isolated: base = 'https://toolkit.test/frontend-toolkit/'
        with sync_playwright() as pw:
            exe = os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
            browser = pw.chromium.launch(headless=True, **({'executable_path': exe} if exe else {}))
            context = browser.new_context(viewport={'width': 1440, 'height': 1080}, reduced_motion='reduce', color_scheme='light')
            page = None
            errors, failed = [], []
            def route_files(route):
                rel=urlparse(route.request.url).path.removeprefix('/frontend-toolkit/')
                target=(ROOT/'build/site'/rel).resolve()
                if target.is_relative_to(ROOT/'build/site') and target.is_file():
                    route.fulfill(status=200,body=target.read_bytes(),headers={'Content-Type':mimetypes.guess_type(target)[0] or 'application/octet-stream','Access-Control-Allow-Origin':'*'})
                else: route.fulfill(status=404,body='Not found')
            if isolated: context.route('https://toolkit.test/**',route_files)
            def navigate(url):
                nonlocal page
                if isolated:
                    if page: page.close()
                    page=context.new_page()
                    page.on('pageerror', lambda error: errors.append(str(error)))
                    page.on('response', lambda response: failed.append(response.url) if response.status >= 400 else None)
                    rel=url.removeprefix(base) or 'index.html'
                    source=(ROOT/'build/site'/rel).read_text()
                    prefix=url.rsplit('/',1)[0]+'/' if rel!='index.html' or url!=base else base
                    page.set_content(source.replace('<head>','<head><base href="'+prefix+'">'))
                else:
                    if page is None:
                        page=context.new_page()
                        page.on('pageerror', lambda error: errors.append(str(error)))
                        page.on('response', lambda response: failed.append(response.url) if response.status >= 400 else None)
                    page.goto(url)
            navigate(base)
            page.wait_for_function('window.ToolkitDemo?.element?.controller')
            check('Public demo defaults to full motion despite reduced system preference', page.evaluate("ToolkitDemo.element.options.motion==='always'"))
            page.locator('#motion-reduced').click()
            check('Public demo explicitly switches to reduced motion', page.evaluate("ToolkitDemo.element.options.motion==='never'"))
            page.locator('#theme-button').click()
            navigate(base + 'lab.html')
            page.wait_for_function('window.MaterialLab?.element?.controller')
            if not isolated: check('Lab keeps the selected UI theme during navigation', page.evaluate("document.documentElement.style.colorScheme==='dark'"))
            check('Lab defaults to full motion with a separate policy from the library', page.evaluate("MaterialLab.element.options.motion==='always' && FrontendToolkit.COMMON_SCHEMA.motion.default==='respect'"))
            page.locator('#lab-motion-reduced').click()
            check('Lab reduced switch sets the actual renderer policy', page.evaluate("MaterialLab.element.options.motion==='never'"))
            page.locator('#lab-motion-full').click()
            check('Lab full switch restores the actual renderer policy', page.evaluate("MaterialLab.element.options.motion==='always'"))
            files = ['index.html', 'lab.html', 'docs/guide.html', 'docs/reference.html', 'docs/publishing.html', 'docs/notices.html', 'examples/index.html', 'examples/managed.html']
            for file in files:
                navigate(base + file)
                if isolated: page.locator('#theme-button').click()
                page.wait_for_timeout(100)
                check(file + ': common chrome and favicon', page.locator('.tk-header').count() == 1 and page.locator('.tk-footer').count() == 1 and page.locator('link[rel="icon"]').get_attribute('href').endswith('site/favicon.svg'))
                check(file + (': explicit theme toggle works' if isolated else ': theme persisted'), page.evaluate("document.documentElement.style.colorScheme==='dark'"))
                for width in [320, 390, 768, 1440]:
                    page.set_viewport_size({'width': width, 'height': 1080})
                    page.wait_for_timeout(70)
                    check(f'{file}: no horizontal overflow at {width}', page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
                if file in ['index.html', 'lab.html', 'docs/guide.html', 'examples/index.html']:
                    name = file.replace('/', '-').replace('.html', '')
                    page.screenshot(path=str(OUT / (name + '-desktop-dark.png')))
                    page.locator('#theme-button').click()
                    page.set_viewport_size({'width': 390, 'height': 844})
                    page.wait_for_timeout(100)
                    page.screenshot(path=str(OUT / (name + '-mobile-light.png')))
                    page.locator('#theme-button').click()
            navigate(base + 'examples/selective.html')
            page.wait_for_function("document.querySelector('ft-glow')?.controller?.renderer")
            check('Selective entry uses only the generated module tree', page.evaluate("!performance.getEntriesByType('resource').some(e=>e.name.includes('/src/'))"))
            check('Manual fire is not fetched early', page.evaluate("!performance.getEntriesByType('resource').some(e=>e.name.endsWith('/effects/fire.js'))"))
            page.locator('#activate').click()
            page.wait_for_function("document.querySelector('#load-state').textContent.includes('is loaded')")
            check('Manual fire loads on request', page.evaluate("performance.getEntriesByType('resource').some(e=>e.name.endsWith('/effects/fire.js'))"))
            check('Manual loading still respects system reduced motion', page.evaluate("document.querySelector('#manual-fire').options.motion==='respect'"))
            # A direct worker test cannot silently pass via the portable renderer.
            worker_result = page.evaluate('''async (base)=>{
              const [{createMaterialWorker},{materialPixels},{getDefaults}]=await Promise.all([
                import(base+'dist/modules/core/material-worker-program.js'),
                import(base+'dist/modules/core/material-texture.js'),
                import(base+'dist/modules/core/schema.js')]);
              const job={width:80,height:48,cssWidth:400,cssHeight:240,rgb:[.6,.45,.3],options:getDefaults('surface','wood/pine')};
              const resource=createMaterialWorker();
              try{
                const result=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Worker timed out')),12000);resource.worker.onmessage=e=>{clearTimeout(timer);e.data.error?reject(Error(e.data.error)):resolve(e.data)};resource.worker.onerror=e=>{clearTimeout(timer);reject(Error(e.message))};resource.worker.postMessage(job)});
                const direct=materialPixels(job);const bytes=new Uint8Array(result.data),expected=new Uint8Array(direct.data);
                return {same:bytes.length===expected.length&&bytes.every((v,i)=>v===expected[i]),size:bytes.length};
              }finally{resource.worker.terminate();resource.dispose();}
            }''', base)
            check('Standalone built material worker executes and matches the direct kernel', worker_result['same'] and worker_result['size'] == 80 * 48 * 4)
            if not isolated:
                check('Generated website does not serve source directory', page.request.get(base + 'src/index.js').status == 404)
                check('Generated website does not serve build scripts', page.request.get(base + 'scripts/build.mjs').status == 404)
            else:
                check('Generated website omits raw source and build scripts', not (ROOT/'build/site/src').exists() and not (ROOT/'build/site/scripts').exists())
            check('No uncaught exceptions across built pages', not errors)
            check('No broken page resource requests', not failed)
            context.close()
            browser.close()
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()
    report = {'mode': manifest['mode'], 'checks': results, 'minificationTested': manifest['mode'] == 'production', 'topLevelHTTPNavigationTested': not isolated}
    (OUT / 'production-results.json').write_text(json.dumps(report, indent=2))
    print(f"{len(results)} built-site browser checks passed. Distribution mode: {manifest['mode']}. Minification tested: {report['minificationTested']}.")


# --isolated is for restricted preparation environments only; CI uses real HTTP navigation.
if __name__ == '__main__':
    main()
