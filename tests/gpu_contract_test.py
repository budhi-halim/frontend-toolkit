"""Test WebGL integration against an API stub, separately from real EGL rendering."""
import json
import os
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]

def main():
    """Check resize, texture ownership, fallback toggles and resource teardown."""
    with sync_playwright() as p:
        exe=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium')
        browser=p.chromium.launch(headless=True,**({'executable_path':exe} if exe else {}))
        page=browser.new_page()
        page.set_content('<div id="mount" style="position:relative;width:600px;height:250px"></div>')
        for name in ['tests/fixtures/webgl-contract-stub.js','dist/frontend-toolkit.js']:
            page.add_script_tag(content=(ROOT/name).read_text())
        results=page.evaluate('''async()=>{
          const tests=[];const check=(name,pass)=>{tests.push({name,passed:!!pass});if(!pass)throw new Error(name);};
          const mount=document.querySelector('#mount');
          const r=FrontendToolkit.createWaterRenderer(mount,{opacity:.4});
          r.resize(600,250);r.render(0);
          check('GPU entry point initializes and draws',r.device.gl.state.draws===1);
          check('Low-level opacity is honored',r.canvas.style.opacity==='0.4');
          check('Backing buffer uses the quality scale',r.canvas.width===420&&r.canvas.height===175);
          const source=document.createElement('canvas');source.width=320;source.height=90;
          await r.setSource(source);
          check('Custom image dimensions reach the shader',r.device.values.uImageResolution.join(',')==='320,90');
          r.setOptions({caustic:.7,distortion:0});r.render(1);
          check('Uniform update cannot reset source aspect ratio',r.device.values.uImageResolution.join(',')==='320,90');
          check('Zero refraction reaches GL unchanged',r.device.gl.state.uniformValues.uDistortionStrength===0);
          r.setOptions({texture:'sand',seed:10});
          check('Built-in settings do not overwrite explicit texture',r.device.source===source);
          const oldDevice=r.device;r.setOptions({forceFallback:true});
          check('Forced fallback disposes GPU resources',r.device===null&&oldDevice.disposed&&oldDevice.gl.state.deleted.length===3);
          r.setOptions({forceFallback:false});r.resize(600,250);await Promise.resolve();
          check('Custom texture survives fallback toggle',r.device.source===source);
          const canvas=r.canvas;canvas.dispatchEvent(new Event('webglcontextlost',{cancelable:true}));
          check('Context loss selects animated Canvas fallback',r.animated&&r.getState().backend==='Canvas 2D fallback');
          r.setOptions({distortion:.041});
          canvas.dispatchEvent(new Event('webglcontextrestored'));
          check('Context restore replays options and texture',r.device.source===source&&r.device.gl.state.uniformValues.uDistortionStrength===.041);
          await r.setSource(null);
          check('Null source restores the configured procedural texture',r.device.source!==source&&r.device.source.width===512);
          r.resize(9000,9000);
          check('Oversized back buffers stay within pixel and dimension budgets',r.canvas.width*r.canvas.height<=4194304&&r.canvas.width<=4096);
          r.destroy();r.destroy();
          check('Destroy is idempotent and removes all nodes',mount.childElementCount===0);
          const waiting=FrontendToolkit.createWaterRenderer(mount,{forceFallback:true});await waiting.setSource(source);waiting.setOptions({forceFallback:false});await Promise.resolve();
          check('Deferred source works after a fallback-first start',waiting.device.source===source);waiting.destroy();
          const glass=FrontendToolkit.createGlassRenderer(mount,{distortion:0});glass.setOptions({distortion:Infinity});glass.resize(1,1);
          check('Low-level glass validation matches the managed API',mount.querySelector('feDisplacementMap').getAttribute('scale')==='0');glass.destroy();
          GLContract.enableWebGL2=true;
          const fluid=FrontendToolkit.createFluidRenderer(mount,{autoEmit:true,resolution:144});fluid.resize(600,250);fluid.render(0);fluid.render(.04);
          let fc=fluid.canvas,cg=GLContract.contexts.find(g=>g.canvas===fc);
          check('Fluid initializes WebGL 2 and submits all solver passes',fluid.getState().backend==='WebGL 2 fluid'&&cg.state.draws>40);
          check('Fluid solver uses a bounded rectangular grid',fluid.getState().simulationGrid==='144,60');
          fluid.resize(320,640);fluid.render(.06);
          check('Fluid resizing recreates bounded targets and deletes the old framebuffers',fluid.getState().simulationGrid==='72,144'&&cg.state.deleted.filter(x=>x==='framebuffer').length>=8);
          const drawBefore=cg.state.draws;fluid.setPointer({active:true,down:true,x:.5,y:.3,dx:.1,dy:.2});fluid.render(.08);
          check('Fluid pointer input produces splat and solver submissions',cg.state.draws>drawBefore+20);
          fc.dispatchEvent(new Event('webglcontextlost',{cancelable:true}));fluid.render(.1);
          check('Fluid switches to portable solver on context loss',fluid.getState().backend==='CPU fluid fallback');
          fc.dispatchEvent(new Event('webglcontextrestored'));fluid.render(.12);
          check('Fluid context restoration rebuilds valid grids and solver programs',fluid.getState().backend==='WebGL 2 fluid'&&fluid.canvas===fc&&fluid.getState().simulationGrid==='72,144');
          fluid.setOptions({forceFallback:true});fluid.render(.14);
          check('Explicit portable fluid mode releases its GPU device',fluid.getState().backend==='CPU fluid fallback'&&!fc.isConnected);
          fluid.setOptions({forceFallback:false});fluid.render(.16);
          check('Fluid can return from portable mode to GPU mode',fluid.getState().backend==='WebGL 2 fluid');
          fluid.destroy();fluid.destroy();check('Fluid destruction removes all device nodes',mount.childElementCount===0);
          return tests;
        }''')
        out=ROOT/'tests/validation';out.mkdir(exist_ok=True)
        (out/'gpu-contract-report.json').write_text(json.dumps({'mode':'Instrumented WebGL stub; not real GPU execution','passed':len(results),'checks':results},indent=2))
        print(f'{len(results)} WebGL API contract checks passed (stub, not shader rendering).')
        browser.close()

if __name__=='__main__':
    main()
