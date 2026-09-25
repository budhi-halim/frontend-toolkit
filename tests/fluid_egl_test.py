"""Run actual GLSL ES 3 fluid passes on Mesa/EGL float framebuffers, not a browser."""
import ctypes as C
import ctypes.util
import json
import subprocess
from pathlib import Path
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'tests/validation'
OUT.mkdir(exist_ok=True)
source=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import{FLUID_VERTEX,FLUID_SHADERS}from'./src/shaders/fluid.js';console.log(JSON.stringify({vertex:FLUID_VERTEX,fragments:FLUID_SHADERS}));"],cwd=ROOT,text=True))
I,U,P,F=C.c_int,C.c_uint,C.c_void_p,C.c_float
E=C.CDLL(ctypes.util.find_library('EGL'))

def egl(name,result,args):
    """Bind an EGL ABI function."""
    f=getattr(E,name);f.restype=result;f.argtypes=args;return f

proc=egl('eglGetProcAddress',P,[C.c_char_p])
def gl(name,result,args):
    """Bind one GLES ABI function through the active implementation."""
    return C.CFUNCTYPE(result,*args)(proc(name.encode()))

getplatform=C.CFUNCTYPE(P,U,P,C.POINTER(I))(proc(b'eglGetPlatformDisplayEXT'))
display=getplatform(0x31DD,None,None)
major,minor=I(),I()
assert egl('eglInitialize',U,[P,C.POINTER(I),C.POINTER(I)])(display,C.byref(major),C.byref(minor))
assert egl('eglBindAPI',U,[U])(0x30A0)
config,count=P(),I()
attrs=(I*15)(0x3033,1,0x3040,0x40,0x3024,8,0x3023,8,0x3022,8,0x3021,8,0x3038,0,0)
assert egl('eglChooseConfig',U,[P,C.POINTER(I),C.POINTER(P),I,C.POINTER(I)])(display,attrs,C.byref(config),1,C.byref(count)) and count.value
W,H=480,360
surface=egl('eglCreatePbufferSurface',P,[P,P,C.POINTER(I)])(display,config,(I*5)(0x3057,W,0x3056,H,0x3038))
context=egl('eglCreateContext',P,[P,P,P,C.POINTER(I)])(display,config,None,(I*3)(0x3098,3,0x3038))
assert context and egl('eglMakeCurrent',U,[P,P,P,P])(display,surface,surface,context)
renderer=gl('glGetString',C.c_char_p,[U])(0x1F01).decode()
version=gl('glGetString',C.c_char_p,[U])(0x1F02).decode()

def shader(text,kind):
    """Compile a production shader and return its native handle."""
    s=gl('glCreateShader',U,[U])(kind);t=C.c_char_p(text.encode())
    gl('glShaderSource',None,[U,I,C.POINTER(C.c_char_p),C.POINTER(I)])(s,1,C.byref(t),None)
    gl('glCompileShader',None,[U])(s);ok=I();gl('glGetShaderiv',None,[U,U,C.POINTER(I)])(s,0x8B81,C.byref(ok))
    if not ok.value:
        log=C.create_string_buffer(20000);gl('glGetShaderInfoLog',None,[U,I,C.POINTER(I),P])(s,20000,None,log);raise AssertionError(log.value.decode())
    return s

vs=shader(source['vertex'],0x8B31)
programs={}
for name,text in source['fragments'].items():
    fs=shader(text,0x8B30);program=gl('glCreateProgram',U,[])()
    for s in (vs,fs):gl('glAttachShader',None,[U,U])(program,s)
    gl('glBindAttribLocation',None,[U,U,C.c_char_p])(program,0,b'aPosition');gl('glLinkProgram',None,[U])(program)
    ok=I();gl('glGetProgramiv',None,[U,U,C.POINTER(I)])(program,0x8B82,C.byref(ok))
    assert ok.value,'link failure '+name
    gl('glDeleteShader',None,[U])(fs);programs[name]=program
buf=U();gl('glGenBuffers',None,[I,C.POINTER(U)])(1,C.byref(buf));gl('glBindBuffer',None,[U,U])(0x8892,buf)
vertices=(F*6)(-1,-1,3,-1,-1,3);gl('glBufferData',None,[U,C.c_ssize_t,P,U])(0x8892,C.sizeof(vertices),vertices,0x88E4)
gl('glEnableVertexAttribArray',None,[U])(0);gl('glVertexAttribPointer',None,[U,I,U,U,I,P])(0,2,0x1406,0,0,None)
gl('glDisable',None,[U])(0x0BE2)
w,h=128,96
targets=[]

def target():
    """Allocate and verify an RGBA16F render target matching production storage."""
    texture,fbo=U(),U();gl('glGenTextures',None,[I,C.POINTER(U)])(1,C.byref(texture));gl('glBindTexture',None,[U,U])(0x0DE1,texture)
    for parameter,value in ((0x2801,0x2600),(0x2800,0x2600),(0x2802,0x812F),(0x2803,0x812F)):
        gl('glTexParameteri',None,[U,U,I])(0x0DE1,parameter,value)
    gl('glTexImage2D',None,[U,I,I,I,I,I,U,U,P])(0x0DE1,0,0x881A,w,h,0,0x1908,0x140B,None)
    gl('glGenFramebuffers',None,[I,C.POINTER(U)])(1,C.byref(fbo));gl('glBindFramebuffer',None,[U,U])(0x8D40,fbo)
    gl('glFramebufferTexture2D',None,[U,U,U,U,I])(0x8D40,0x8CE0,0x0DE1,texture,0)
    assert gl('glCheckFramebufferStatus',U,[U])(0x8D40)==0x8CD5
    gl('glClearColor',None,[F,F,F,F])(0,0,0,0);gl('glClear',None,[U])(0x4000)
    result={'texture':texture.value,'fbo':fbo.value};targets.append(result);return result

velocity=[target(),target()];dye=[target(),target()];pressure=[target(),target()];divergence=target();curl=target()
counts={name:0 for name in programs}

def draw(name,destination,**values):
    """Execute a production fluid pass, enforcing no read/write framebuffer feedback."""
    program=programs[name];gl('glUseProgram',None,[U])(program)
    gl('glBindFramebuffer',None,[U,U])(0x8D40,destination['fbo'] if destination else 0)
    gl('glViewport',None,[I,I,I,I])(0,0,w if destination else W,h if destination else H)
    unit=0
    for key,value in {'uTexel':[1/w,1/h],**values}.items():
        loc=gl('glGetUniformLocation',I,[U,C.c_char_p])(program,key.encode())
        if loc<0:continue
        if isinstance(value,dict):
            assert destination is None or value['texture']!=destination['texture'],'Texture feedback'
            gl('glActiveTexture',None,[U])(0x84C0+unit);gl('glBindTexture',None,[U,U])(0x0DE1,value['texture']);gl('glUniform1i',None,[I,I])(loc,unit);unit+=1
        elif isinstance(value,(list,tuple)):
            gl('glUniform'+str(len(value))+'fv',None,[I,I,C.POINTER(F)])(loc,1,(F*len(value))(*value))
        else:gl('glUniform1f',None,[I,F])(loc,value)
    gl('glDrawArrays',None,[U,I,I])(4,0,3)
    assert gl('glGetError',U,[])()==0,'GL error in '+name
    counts[name]+=1

def floats(t):
    """Read native floating-point state to check finite values and numerical changes."""
    gl('glBindFramebuffer',None,[U,U])(0x8D40,t['fbo'])
    data=(F*(w*h*4))();gl('glReadPixels',None,[I,I,I,I,U,U,P])(0,0,w,h,0x1908,0x1406,data)
    assert gl('glGetError',U,[])()==0,'Float readback unsupported'
    a=np.ctypeslib.as_array(data).copy().reshape(h,w,4);assert np.isfinite(a).all();return a

def project(iterations=24):
    """Run the same pressure warm-start, Jacobi solve, and projection as the device."""
    draw('divergence',divergence,uVelocity=velocity[0])
    draw('copy',pressure[1],uSource=pressure[0],uDamping=.75);pressure.reverse()
    for _ in range(iterations):
        draw('pressure',pressure[1],uPressure=pressure[0],uDivergence=divergence);pressure.reverse()
    draw('project',velocity[1],uVelocity=velocity[0],uPressure=pressure[0]);velocity.reverse()

# An isolated projection should reduce mean absolute divergence.
draw('splat',velocity[1],uSource=velocity[0],uPoint=[.45,.4],uColor=[.6,.3,0],uRadius=.09,uAspect=w/h);velocity.reverse()
draw('divergence',divergence,uVelocity=velocity[0]);before=float(np.abs(floats(divergence)[:,:,0]).mean())
project(48)
draw('divergence',divergence,uVelocity=velocity[0]);after=float(np.abs(floats(divergence)[:,:,0]).mean())
assert after<before,f'Projection increased divergence: {before} -> {after}'

images=[]
for frame in range(60):
    t=frame/60
    if frame<30:
        for pair,col in ((velocity,[.25,.38,0]),(dye,[1.3,.35,.95])):
            draw('splat',pair[1],uSource=pair[0],uPoint=[.42+.08*np.sin(t*5),.25],uColor=col,uRadius=.045,uAspect=w/h);pair.reverse()
    draw('advect',velocity[1],uVelocity=velocity[0],uSource=velocity[0],uDt=1/60,uDamping=.3);velocity.reverse()
    draw('curl',curl,uVelocity=velocity[0]);draw('force',velocity[1],uVelocity=velocity[0],uCurl=curl,uDye=dye[0],uDt=1/60,uStrength=22*.0004,uBuoyancy=.45);velocity.reverse()
    project()
    draw('advect',dye[1],uVelocity=velocity[0],uSource=dye[0],uDt=1/60,uDamping=.6);dye.reverse()
    if frame in (25,59):
        draw('display',None,uDye=dye[0],uKind=0,uColor=[.3,.7,.9],uShading=.65)
        pixels=(C.c_ubyte*(W*H*4))();gl('glReadPixels',None,[I,I,I,I,U,U,P])(0,0,W,H,0x1908,0x1401,pixels)
        images.append(np.ctypeslib.as_array(pixels).copy().reshape(H,W,4))
state=floats(dye[0]);vel=floats(velocity[0]);pres=floats(pressure[0]);delta=float(np.abs(images[1].astype(float)-images[0]).mean())
assert float(state[:,:,:3].max())>.01 and delta>.01 and images[-1][:,:,3].max()>0
image=Image.fromarray(images[-1]).transpose(Image.Transpose.FLIP_TOP_BOTTOM);image.save(OUT/'fluid-gpu-alpha.png')
background=Image.new('RGBA',(W,H),(13,20,24,255));background.alpha_composite(image);background.convert('RGB').save(OUT/'fluid-gpu.png')
# Exercise the actual fire display branch on the same evolving density field.
draw('display',None,uDye=dye[0],uKind=2,uColor=[1,.25,.04],uShading=.65)
pixels=(C.c_ubyte*(W*H*4))();gl('glReadPixels',None,[I,I,I,I,U,U,P])(0,0,W,H,0x1908,0x1401,pixels)
fire_pixels=np.ctypeslib.as_array(pixels).copy().reshape(H,W,4)
visible=fire_pixels[:,:,3]>32
assert visible.any(),'Fire display produced no visible density'
fire_channels=fire_pixels[visible][:,:3].mean(axis=0)
assert fire_channels[0]>fire_channels[1]>fire_channels[2],'Fire display lost the red/orange heat mapping'
fire_image=Image.fromarray(fire_pixels).transpose(Image.Transpose.FLIP_TOP_BOTTOM)
background=Image.new('RGBA',(W,H),(13,20,24,255));background.alpha_composite(fire_image);background.convert('RGB').save(OUT/'fluid-fire-gpu.png')
report={'mode':'Actual GLES 3 shaders and RGBA16F framebuffer simulation on Mesa EGL, not native browser WebGL.','renderer':renderer,'version':version,'compiledPasses':len(programs),'frames':60,'framebufferCount':len(targets),'passExecutions':counts,'divergenceBefore':before,'divergenceAfter':after,'finiteState':True,'firePaletteVerified':True,'fireMeanRGB':fire_channels.tolist(),'dyeMaximum':float(state[:,:,:3].max()),'frameDifference':delta,'glError':gl('glGetError',U,[])()}
(OUT/'fluid-egl-report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
for t in targets:
    gl('glDeleteTextures',None,[I,C.POINTER(U)])(1,C.byref(U(t['texture'])));gl('glDeleteFramebuffers',None,[I,C.POINTER(U)])(1,C.byref(U(t['fbo'])))
for program in programs.values():gl('glDeleteProgram',None,[U])(program)
gl('glDeleteShader',None,[U])(vs);gl('glDeleteBuffers',None,[I,C.POINTER(U)])(1,C.byref(buf))
egl('eglMakeCurrent',U,[P,P,P,P])(display,None,None,None)
egl('eglDestroySurface',U,[P,P])(display,surface);egl('eglDestroyContext',U,[P,P])(display,context);egl('eglTerminate',U,[P])(display)
