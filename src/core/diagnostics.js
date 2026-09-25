// === LOCAL DIAGNOSTICS; NO TELEMETRY OR AUTOMATIC NETWORK REQUESTS ===
const entries=[];
let settings={console:false,level:'info'},sequence=0;
const priorities={info:0,warn:1,error:2};
export function setDiagnostics(options={}){
  if(typeof options.console==='boolean')settings.console=options.console;
  if(Object.prototype.hasOwnProperty.call(priorities,options.level))settings.level=options.level;
  return {...settings};
}
export function recordDiagnostic(level,code,message,detail={}){
  const entry={id:++sequence,at:new Date().toISOString(),level,code,message,...detail};
  entries.push(entry);if(entries.length>160)entries.shift();
  if(settings.console&&priorities[level]>=priorities[settings.level]){
    const method=level==='info'?'info':level;globalThis.console?.[method]?.(`[frontend-toolkit:${code}] ${message}`,detail);
  }
  return entry;
}
export function getDiagnostics(){return{settings:{...settings},events:entries.map(item=>({...item}))};}
export function environmentReport(){
  const nav=globalThis.navigator??{},doc=globalThis.document;
  return{userAgent:nav.userAgent??'',origin:globalThis.location?.origin??'',protocol:globalThis.location?.protocol??'',secureContext:globalThis.isSecureContext===true,
    reducedMotion:globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false,documentVisibility:doc?.visibilityState??'unknown',
    hardwareConcurrency:nav.hardwareConcurrency??null,deviceMemoryGiB:nav.deviceMemory??null,devicePixelRatio:globalThis.devicePixelRatio??1,
    webgpuAPIExposed:Boolean(nav.gpu),webgpuUsed:false,canvas2D:typeof CanvasRenderingContext2D!=='undefined',
    resizeObserver:typeof ResizeObserver!=='undefined',intersectionObserver:typeof IntersectionObserver!=='undefined',
    roundRect:typeof Path2D!=='undefined'&&typeof Path2D.prototype.roundRect==='function',
    modernColors:globalThis.CSS?.supports('color','oklch(.7 .1 140)')??false};
}
export function probeWebGL(){
  if(typeof document==='undefined')return{available:false,reason:'No browser document'};
  const canvas=document.createElement('canvas');canvas.width=canvas.height=2;let gl=null,creation='',program=null,buffer=null,vertex=null,fragment=null;
  canvas.addEventListener('webglcontextcreationerror',event=>{creation=event.statusMessage||'Context creation rejected';});
  try{
    gl=canvas.getContext('webgl',{alpha:true,antialias:false,depth:false})||canvas.getContext('experimental-webgl');
    if(!gl)return{available:false,rendering:false,reason:creation||'Browser could not create a WebGL context. Check browser graphics status and drivers.'};
    const compile=(kind,source)=>{const shader=gl.createShader(kind);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const error=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw new Error(error||'Probe shader compilation failed');}return shader;};
    vertex=compile(gl.VERTEX_SHADER,'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}');
    fragment=compile(gl.FRAGMENT_SHADER,'precision mediump float;void main(){gl_FragColor=vec4(.25,.5,.75,1.);}');
    program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.bindAttribLocation(program,0,'p');gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'Probe program linking failed');
    gl.useProgram(program);buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);gl.viewport(0,0,2,2);gl.drawArrays(gl.TRIANGLES,0,3);
    const pixel=new Uint8Array(4);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
    const rendering=Math.abs(pixel[0]-64)<=2&&Math.abs(pixel[1]-128)<=2&&Math.abs(pixel[2]-191)<=2&&pixel[3]===255;
    const precision=gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT);
    return{available:true,rendering,pixel:[...pixel],version:gl.getParameter(gl.VERSION),renderer:gl.getParameter(gl.RENDERER),vendor:gl.getParameter(gl.VENDOR),
      fragmentHighp:precision?{precision:precision.precision,rangeMin:precision.rangeMin,rangeMax:precision.rangeMax}:null,
      maxTextureSize:gl.getParameter(gl.MAX_TEXTURE_SIZE),reason:rendering?'Simple WebGL draw/readback passed; this does not validate every effect shader.':'Context exists, but the test pixel was not rendered correctly.'};
  }catch(error){return{available:Boolean(gl),rendering:false,reason:error.message};}
  finally{if(gl&&!gl.isContextLost()){if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program);if(vertex)gl.deleteShader(vertex);if(fragment)gl.deleteShader(fragment);gl.getExtension('WEBGL_lose_context')?.loseContext();}canvas.width=canvas.height=1;}
}
export function diagnose(target){
  const stats=target?.getStats?.()??null;
  return{environment:environmentReport(),effect:stats,webgl:probeWebGL(),diagnostics:getDiagnostics()};
}
