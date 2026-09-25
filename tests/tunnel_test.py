"""Native Canvas tests for the tunnel color seam; no WebGL stub is used.

Run after building with: python tests/tunnel_test.py
The current distribution is used verbatim. This does not claim browser GPU coverage.
"""
import json
import os
from pathlib import Path
import shutil
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'tests' / 'validation'
OUT.mkdir(exist_ok=True)


def main():
    """Check actual rendered colors across the negative-X angle boundary."""
    checks = []
    with sync_playwright() as pw:
        executable = os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
        browser = pw.chromium.launch(headless=True, **({'executable_path': executable} if executable else {}))
        page = browser.new_page(viewport={'width': 800, 'height': 500})
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.set_content('<style>body{margin:0;background:#101619}#mount{position:relative;width:280px;height:280px}</style><div id="mount"></div>')
        page.add_script_tag(content=(ROOT / 'dist/frontend-toolkit.js').read_text(encoding='utf8'))
        checks = page.evaluate('''()=>{
          const results=[],check=(name,ok,detail={})=>{
            results.push({name,passed:!!ok,...detail});if(!ok)throw Error(name+': '+JSON.stringify(detail));
          };
          const mount=document.querySelector('#mount'),FT=FrontendToolkit;
          const options={...FT.getDefaults('art','tunnel'),quality:1,dprCap:1,adaptive:false,forceFallback:true,
                         color:'#ff0000',color2:'#0000ff',background:'#000000'};
          const r=FT.createArtRenderer(mount,options);r.resize(280,280);
          const pixels=()=>r.canvas.getContext('2d').getImageData(0,0,r.canvas.width,r.canvas.height).data;
          const signature=d=>{let h=2166136261;for(const v of d)h=Math.imul(h^v,16777619);return h>>>0;};
          check('Portable renderer is actually selected',r.getState().backend==='Canvas 2D fallback');
          for(const amount of [3,6,10])for(const time of [0,1.5,3.5,12]){
            r.setOptions({amount});r.render(time);const data=pixels(),w=r.canvas.width,h=r.canvas.height;
            let count=0,worst=0;
            for(let x=5;x<Math.floor(w*.35);x++){
              const a=(Math.floor(h/2)-1)*w*4+x*4,b=Math.floor(h/2)*w*4+x*4;
              const sa=data[a]+data[a+2],sb=data[b]+data[b+2];
              if(sa<40||sb<40)continue;
              count++;worst=Math.max(worst,Math.abs(data[a+2]/sa-data[b+2]/sb));
            }
            check(`No color jump: structures=${amount}, time=${time}`,count>=5&&worst<.04,{samples:count,maxHueDelta:worst});
          }
          r.setOptions({amount:6,color:'#3f7eae',color2:'#f098c9'});r.render(3.5);
          const before=signature(pixels());r.render(4.1);
          check('Animation changes real Canvas pixels',signature(pixels())!==before);
          r.render(3.5);check('Same time redraw is deterministic',signature(pixels())===before);
          r.setOptions({transparent:true});r.render(3.5);let lo=255,hi=0;
          for(let i=3,data=pixels();i<data.length;i+=4){lo=Math.min(lo,data[i]);hi=Math.max(hi,data[i]);}
          check('Transparent mode retains both clear and luminous pixels',lo===0&&hi>100,{alphaMin:lo,alphaMax:hi});
          r.resize(281,281);r.render(0);
          const w=r.canvas.width,h=r.canvas.height,center=(Math.floor(h/2)*w+Math.floor(w/2))*4;
          check('Odd-sized canvas has a clear tunnel center',pixels()[center+3]===0);
          r.setOptions({fallbackAnimation:'static'});check('Static fallback opts out of continuous animation',!r.animated);
          r.setOptions({transparent:false,fallbackAnimation:'animated'});r.resize(760,290);r.render(3.5);
          mount.style.width='760px';mount.style.height='290px';
          window.tunnelRenderer=r;
          return results;
        }''')
        page.locator('#mount').screenshot(path=str(OUT / 'tunnel-canvas.png'))
        destroyed = page.evaluate('()=>{const canvas=tunnelRenderer.canvas;tunnelRenderer.destroy();return !canvas.isConnected&&canvas.width===1&&canvas.height===1;}')
        checks.append({'name': 'Destroy releases the output canvas', 'passed': destroyed})
        assert destroyed
        checks.append({'name': 'No uncaught browser errors', 'passed': not errors})
        assert not errors, errors
        browser.close()
    manifest = json.loads((ROOT / 'dist/manifest.json').read_text())
    (OUT / 'tunnel-browser-results.json').write_text(json.dumps({'distribution': manifest['mode'], 'checks': checks}, indent=2))
    print(f"{len(checks)} tunnel Canvas checks passed. Distribution: {manifest['mode']}; browser GPU not exercised.")


if __name__ == '__main__':
    main()
