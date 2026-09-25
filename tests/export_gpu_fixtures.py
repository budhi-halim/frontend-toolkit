"""Capture actual renderer uniforms with an instrumented API; shader validation is separate."""
import json
import os
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
CASES={
 'water':['water','pool',{}], 'fire':['fire','hearth',{}], 'ribbon':['fire','ribbon-flame',{}],
 'embers':['fire','embers',{}], 'candle':['fire','candle',{}],
 'border':['fire','burning-border',{}], 'jet':['fire','flamethrower',{}],
 'all-right':['fire','flamethrower',{'sourceEdge':'all','outPolicy':'border','reach':120}],
 'all-strict':['fire','flamethrower',{'sourceEdge':'all','outPolicy':'strict','reach':120}],
 'all-straight':['fire','flamethrower',{'sourceEdge':'all','outPolicy':'border','respectGravity':False,'reach':120,'wind':0,'turbulence':0}],
 'smoke':['smoke','plume',{}], 'clouds':['clouds','cumulus',{}], 'sunset':['clouds','sunset',{}], 'aurora':['aurora','borealis',{}],
 **{k:['field',k,{}] for k in ['ocean','lava','nebula','iridescence','magnetic']},
 'sea':['sea','golden',{}], 'sea-sunset':['sea','sunset',{}],
 **{k:['art',k,{}] for k in ['metaballs','chrome','silk','interference','tunnel']}
}
def main():
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'))
  page=browser.new_page()
  page.set_content('<div id="mount" style="position:relative;width:600px;height:300px;border-radius:24px"></div>')
  for f in ['tests/fixtures/webgl-contract-stub.js','dist/frontend-toolkit.js']:
   page.add_script_tag(content=(ROOT/f).read_text())
  data=page.evaluate('''cases=>{
   const output={};for(const [id,[family,preset,patch]] of Object.entries(cases)){
    const create=FrontendToolkit['create'+family[0].toUpperCase()+family.slice(1)+'Renderer'];
    const r=create(mount,{...FrontendToolkit.getDefaults(family,preset),...patch,adaptive:false});
    r.resize(600,300);r.setPointer?.({x:.5,y:.5,active:false});r.render(0);
    const collect=()=>Object.fromEntries(Object.entries(r.getUniforms()).map(([k,v])=>[k,ArrayBuffer.isView(v)?Array.from(v):v]));
    output[id]={...collect(),uPointer:[.5,.5,0],uPointerDelta:[0,0]};
    const frames={};for(let i=1;i<=246;i++){r.render(i/60);if(i===210||i===246)frames[String(i/60)]=collect();}output[id]._frames=frames;r.destroy();
   }return output;
  }''',CASES)
  (ROOT/'tests/fixtures/gpu-uniforms.json').write_text(json.dumps(data,indent=2)+'\n')
  browser.close()
 print(f'Exported {len(data)} uniform cases. This is not a shader execution test.')
if __name__=='__main__':main()
