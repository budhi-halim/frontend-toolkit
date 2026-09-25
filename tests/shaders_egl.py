"""Optional Linux Mesa/EGL + Pillow shader test; not a browser/GPU performance benchmark."""
import ctypes as C
import ctypes.util
import json
import sys
import subprocess
from pathlib import Path
from PIL import Image, ImageStat, ImageChops

PROJECT=Path(__file__).resolve().parents[1]
root=PROJECT/'tests/validation'
root.mkdir(exist_ok=True)
fixtures=PROJECT/'tests/fixtures'
export="import{WATER_FRAGMENT}from'./src/shaders/water.js';import{FIRE_FRAGMENT}from'./src/shaders/fire.js';import{SMOKE_FRAGMENT}from'./src/shaders/smoke.js';import{CLOUDS_FRAGMENT}from'./src/shaders/atmosphere.js';import{FIELD_FRAGMENT}from'./src/shaders/field.js';import{AURORA_FRAGMENT}from'./src/shaders/aurora.js';import{SEA_FRAGMENT}from'./src/shaders/sea.js';import{ART_FRAGMENT}from'./src/shaders/art.js';console.log(JSON.stringify({water:WATER_FRAGMENT,fire:FIRE_FRAGMENT,ribbon:FIRE_FRAGMENT,embers:FIRE_FRAGMENT,'all-right':FIRE_FRAGMENT,'all-strict':FIRE_FRAGMENT,'all-straight':FIRE_FRAGMENT,smoke:SMOKE_FRAGMENT,clouds:CLOUDS_FRAGMENT,sunset:CLOUDS_FRAGMENT,aurora:AURORA_FRAGMENT,candle:FIRE_FRAGMENT,border:FIRE_FRAGMENT,jet:FIRE_FRAGMENT,ocean:FIELD_FRAGMENT,lava:FIELD_FRAGMENT,nebula:FIELD_FRAGMENT,iridescence:FIELD_FRAGMENT,magnetic:FIELD_FRAGMENT,sea:SEA_FRAGMENT,'sea-sunset':SEA_FRAGMENT,metaballs:ART_FRAGMENT,chrome:ART_FRAGMENT,silk:ART_FRAGMENT,interference:ART_FRAGMENT,tunnel:ART_FRAGMENT}));"
shader_data=json.loads(subprocess.check_output(['node','--input-type=module','-e',export],cwd=PROJECT,text=True))
if len(sys.argv)>1:shader_data={key:value for key,value in shader_data.items() if key in sys.argv[1:]}
E=C.CDLL(ctypes.util.find_library('EGL'))
def egl(name,restype,args):
    """Bind an EGL function with explicit ctypes ABI declarations."""
    f=getattr(E,name);f.restype=restype;f.argtypes=args;return f
I=C.c_int;U=C.c_uint;P=C.c_void_p;F=C.c_float
getproc=egl('eglGetProcAddress',P,[C.c_char_p])
def gl(name,restype,args):
    """Resolve a GLES function from the current EGL implementation."""
    return C.CFUNCTYPE(restype,*args)(getproc(name.encode()))
getplatform=C.CFUNCTYPE(P,U,P,C.POINTER(I))(getproc(b'eglGetPlatformDisplayEXT'))
d=getplatform(0x31DD,None,None)
a,b=I(),I()
assert egl('eglInitialize',U,[P,C.POINTER(I),C.POINTER(I)])(d,C.byref(a),C.byref(b))
assert egl('eglBindAPI',U,[U])(0x30A0)
config=P();count=I()
attrs=(I*15)(0x3033,1,0x3040,4,0x3024,8,0x3023,8,0x3022,8,0x3021,8,0x3038,0,0)
assert egl('eglChooseConfig',U,[P,C.POINTER(I),C.POINTER(P),I,C.POINTER(I)])(d,attrs,C.byref(config),1,C.byref(count)) and count.value
W,H=1800,1500
surface=egl('eglCreatePbufferSurface',P,[P,P,C.POINTER(I)])(d,config,(I*5)(0x3057,W,0x3056,H,0x3038))
context=egl('eglCreateContext',P,[P,P,P,C.POINTER(I)])(d,config,None,(I*3)(0x3098,2,0x3038))
assert egl('eglMakeCurrent',U,[P,P,P,P])(d,surface,surface,context)
print('Device:',gl('glGetString',C.c_char_p,[U])(0x1F01).decode())
createShader=gl('glCreateShader',U,[U]);shaderSource=gl('glShaderSource',None,[U,I,C.POINTER(C.c_char_p),C.POINTER(I)]);compileShader=gl('glCompileShader',None,[U]);shaderIV=gl('glGetShaderiv',None,[U,U,C.POINTER(I)])
def compile(source,kind):
    """Compile one actual GLSL shader and surface its driver error log."""
    s=createShader(kind);text=C.c_char_p(source.encode());shaderSource(s,1,C.byref(text),None);compileShader(s);ok=I();shaderIV(s,0x8B81,C.byref(ok))
    if not ok.value:
        log=C.create_string_buffer(20000);gl('glGetShaderInfoLog',None,[U,I,C.POINTER(I),P])(s,20000,None,log);raise RuntimeError(log.value.decode())
    return s
vs=compile('attribute vec2 aPosition; varying vec2 vUv; void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}',0x8B31)
uniforms=json.loads(fixtures.joinpath('gpu-uniforms.json').read_text())
results={}
for effect,source in shader_data.items():
    size=uniforms[effect].get('uViewSize',[600,300]);reduction=min(1,1000/max(size));W,H=max(1,round(size[0]*reduction)),max(1,round(size[1]*reduction))
    fs=compile(source,0x8B30);program=gl('glCreateProgram',U,[])()
    for shader in [vs,fs]:gl('glAttachShader',None,[U,U])(program,shader)
    gl('glBindAttribLocation',None,[U,U,C.c_char_p])(program,0,b'aPosition');gl('glLinkProgram',None,[U])(program)
    ok=I();gl('glGetProgramiv',None,[U,U,C.POINTER(I)])(program,0x8B82,C.byref(ok))
    if not ok.value:raise RuntimeError('link failed '+effect)
    gl('glUseProgram',None,[U])(program)
    buf=U();gl('glGenBuffers',None,[I,C.POINTER(U)])(1,C.byref(buf));gl('glBindBuffer',None,[U,U])(0x8892,buf.value)
    vertices=(F*6)(-1,-1,3,-1,-1,3);gl('glBufferData',None,[U,C.c_ssize_t,P,U])(0x8892,C.sizeof(vertices),vertices,0x88E4)
    gl('glEnableVertexAttribArray',None,[U])(0);gl('glVertexAttribPointer',None,[U,I,U,U,I,P])(0,2,0x1406,0,0,None)
    texture=U();gl('glGenTextures',None,[I,C.POINTER(U)])(1,C.byref(texture));gl('glBindTexture',None,[U,U])(0x0DE1,texture.value)
    for param,val in [(0x2801,0x2601),(0x2800,0x2601),(0x2802,0x812F),(0x2803,0x812F)]:gl('glTexParameteri',None,[U,U,I])(0x0DE1,param,val)
    tex=Image.open(fixtures/'water-pool.png').convert('RGBA').transpose(Image.Transpose.FLIP_TOP_BOTTOM);pixels=C.create_string_buffer(tex.tobytes())
    gl('glTexImage2D',None,[U,I,I,I,I,I,U,U,P])(0x0DE1,0,0x1908,tex.width,tex.height,0,0x1908,0x1401,pixels)
    values={**uniforms[effect],'uResolution':[W,H],'u_resolution':[W,H],'uImageResolution':[512,512],'uTexture':0}
    def uniform(name,value):
        """Upload a numeric test uniform to the linked program."""
        loc=gl('glGetUniformLocation',I,[U,C.c_char_p])(program,name.encode())
        if loc<0:return
        if isinstance(value,list):
            components=4 if name.endswith('[0]') else len(value)
            gl('glUniform'+str(components)+'fv',None,[I,I,C.POINTER(F)])(loc,len(value)//components,(F*len(value))(*value))
        elif name=='uTexture':gl('glUniform1i',None,[I,I])(loc,value)
        else:gl('glUniform1f',None,[I,F])(loc,value)
    for key,value in values.items():uniform(key,value)
    images=[]
    for t in [3.5,4.1]:
        for key,value in uniforms[effect].get('_frames',{}).get(str(t),{}).items():uniform(key,value)
        uniform('uTime',t);uniform('u_time',t)
        gl('glViewport',None,[I,I,I,I])(0,0,W,H);gl('glDrawArrays',None,[U,I,I])(4,0,3);gl('glFinish',None,[])()
        out=(C.c_ubyte*(W*H*4))();gl('glReadPixels',None,[I,I,I,I,U,U,P])(0,0,W,H,0x1908,0x1401,out)
        image=Image.frombytes('RGBA',(W,H),bytes(out)).transpose(Image.Transpose.FLIP_TOP_BOTTOM);images.append(image)
    error=gl('glGetError',U,[])()
    delta=sum(ImageStat.Stat(ImageChops.difference(*images)).mean)
    backdrop=Image.new('RGBA',(W,H),(14,20,22,255));backdrop.alpha_composite(images[0]);backdrop.convert('RGB').save(root/f'{effect}-gpu.png')
    images[0].save(root/f'{effect}-alpha.png')
    results[effect]={'compiled':True,'glError':error,'frameDelta':delta,'alphaRange':images[0].getchannel('A').getextrema()}
    print(effect,results[effect])
    assert error==0 and delta>.01, f'{effect} did not render a changing, error-free default frame'
    if effect=='fire':
        # These assertions execute the actual fire shader. A contract stub alone
        # cannot establish that a newly exposed uniform changes the image.
        control_results=[]
        def control_frame(time,**changes):
            for name,value in changes.items():uniform(name,value)
            uniform('uTime',time)
            gl('glDrawArrays',None,[U,I,I])(4,0,3);gl('glFinish',None,[])()
            pixels=(C.c_ubyte*(W*H*4))();gl('glReadPixels',None,[I,I,I,I,U,U,P])(0,0,W,H,0x1908,0x1401,pixels)
            return Image.frombytes('RGBA',(W,H),bytes(pixels))
        def difference(a,b):return sum(ImageStat.Stat(ImageChops.difference(a,b)).mean)
        def control_check(name,ok):
            control_results.append({'name':name,'passed':bool(ok)});assert ok,name
        a=control_frame(0,uFlameSpeed=0,uFlickerSpeed=0);b=control_frame(4)
        control_check('Zero flow and flicker produce a truly static shader frame',difference(a,b)==0)
        a=control_frame(0,uFlameSpeed=1,uFlickerSpeed=0);b=control_frame(2)
        control_check('Flow moves independently of flicker',difference(a,b)>.01)
        a=control_frame(0,uFlameSpeed=0,uFlickerSpeed=1);b=control_frame(2)
        control_check('Flicker changes independently of flow',difference(a,b)>.01)
        a=control_frame(1,uFlameSpeed=3,uFlickerSpeed=0);b=control_frame(3,uFlameSpeed=1)
        control_check('Threefold flow matches threefold advected time with flicker held fixed',difference(a,b)<.001)
        a=control_frame(1,uFlameSpeed=1,uFlickerSpeed=1,uSpread=.14,uSourceOffset=.5,uEmbers=0);b=control_frame(1,uSpread=.85)
        control_check('Source width changes the visible emission envelope',sum(b.getchannel('A').tobytes())>sum(a.getchannel('A').tobytes())*2)
        a=control_frame(1,uSpread=.2,uSourceOffset=.2);b=control_frame(1,uSourceOffset=.8)
        def centroid(image):
            values=list(image.getchannel('A').tobytes());total=sum(values)
            return sum((i%W)*v for i,v in enumerate(values))/max(1,total)
        control_check('Source offset moves the emitting region instead of merely changing color',centroid(b)-centroid(a)>W*.3)
        control_check('All fire-control draws finish without a GL error',gl('glGetError',U,[])()==0)
        root.joinpath('fire-control-egl-results.json').write_text(json.dumps(control_results,indent=2))
        print('Fire controls:',len(control_results),'real shader checks passed')
    if effect=='tunnel':
        # Execute the complete tunnel branch at near-identical world coordinates,
        # rather than relying on a screenshot or a CPU copy of its palette formula.
        probe_source=source.replace('uniform vec2 uResolution;', 'uniform vec2 uResolution,uProbe;')
        original_coords='vec2 p=(vUv-.5)*vec2(aspect,1.)*uScale;'
        assert original_coords in probe_source, 'Tunnel probe coordinate anchor changed'
        probe_source=probe_source.replace(original_coords,'vec2 p=uProbe;')
        probe_shader=compile(probe_source,0x8B30)
        saved_program=program
        program=gl('glCreateProgram',U,[])()
        for shader in [vs,probe_shader]:gl('glAttachShader',None,[U,U])(program,shader)
        gl('glBindAttribLocation',None,[U,U,C.c_char_p])(program,0,b'aPosition')
        gl('glLinkProgram',None,[U])(program)
        linked=I();gl('glGetProgramiv',None,[U,U,C.POINTER(I)])(program,0x8B82,C.byref(linked))
        assert linked.value, 'Tunnel probe linking failed'
        gl('glUseProgram',None,[U])(program)
        for key,value in values.items():uniform(key,value)
        gl('glViewport',None,[I,I,I,I])(0,0,1,1)
        def probe(x,y):
            """Read one pixel from the real fragment shader at the chosen coordinate."""
            uniform('uProbe',[x,y])
            gl('glDrawArrays',None,[U,I,I])(4,0,3)
            pixel=(C.c_ubyte*4)()
            gl('glReadPixels',None,[I,I,I,I,U,U,P])(0,0,1,1,0x1908,0x1401,pixel)
            return list(pixel)
        comparisons=[]
        lit_samples=0
        for transparent in [0,1]:
            uniform('uTransparent',transparent)
            for amount in [3,6,10]:
                uniform('uAmount',amount)
                for time in [0,1.5,3.5]:
                    uniform('uTime',time)
                    for radius in [.045,.1,.25,.5,.85]:
                        upper=probe(-radius,radius*1e-7)
                        lower=probe(-radius,-radius*1e-7)
                        delta=max(abs(a-b) for a,b in zip(upper,lower))
                        lit_samples+=int(max(upper[:3])>40)
                        comparisons.append({'amount':amount,'time':time,'radius':radius,'transparent':transparent,'delta':delta})
                        assert delta<=1, f'Tunnel angle seam: {comparisons[-1]}'
        assert lit_samples>=10, 'Seam checks must include genuinely illuminated pixels'
        uniform('uTransparent',1);clear_center=probe(0.,0.)
        assert clear_center[3]==0, f'Tunnel center must be clear: {clear_center}'
        uniform('uTransparent',0);opaque_center=probe(0.,0.)
        expected=[round(v*255) for v in values['uBackground']]+[255]
        assert max(abs(a-b) for a,b in zip(opaque_center,expected))<=1, f'Tunnel center must match background: {opaque_center}'
        assert gl('glGetError',U,[])()==0, 'Tunnel probe GL error'
        root.joinpath('tunnel-seam-egl-results.json').write_text(json.dumps({'comparisons':comparisons,'litSamples':lit_samples,'maxChannelDelta':max(c['delta'] for c in comparisons),'clearCenter':clear_center,'opaqueCenter':opaque_center},indent=2))
        print('Tunnel:',len(comparisons),'real shader seam comparisons passed; maximum channel delta',max(c['delta'] for c in comparisons))
        gl('glDeleteShader',None,[U])(probe_shader);gl('glDeleteProgram',None,[U])(program)
        program=saved_program
        gl('glUseProgram',None,[U])(program)
    gl('glDeleteShader',None,[U])(fs);gl('glDeleteProgram',None,[U])(program);gl('glDeleteBuffers',None,[I,C.POINTER(U)])(1,C.byref(buf));gl('glDeleteTextures',None,[I,C.POINTER(U)])(1,C.byref(texture))
root.joinpath('egl-results.json').write_text(json.dumps(results,indent=2))

gl('glDeleteShader',None,[U])(vs)
egl('eglMakeCurrent',U,[P,P,P,P])(d,None,None,None)
egl('eglDestroySurface',U,[P,P])(d,surface)
egl('eglDestroyContext',U,[P,P])(d,context)
egl('eglTerminate',U,[P])(d)
