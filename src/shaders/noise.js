// === CONTINUOUS, TEXTURE-FREE VALUE FIELDS ===
export const NOISE_GLSL=`
float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float hash31(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+1.),f.x),f.y);}
float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash31(i),hash31(i+vec3(1,0,0)),f.x),mix(hash31(i+vec3(0,1,0)),hash31(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash31(i+vec3(0,0,1)),hash31(i+vec3(1,0,1)),f.x),mix(hash31(i+vec3(0,1,1)),hash31(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm2(vec2 p){float v=0.,a=.5;mat2 r=mat2(.8,-.6,.6,.8);for(int j=0;j<5;j++){v+=noise2(p)*a;p=r*p*2.03+13.1;a*=.5;}return v;}
float fbm3(vec3 p){float v=0.,a=.55;for(int j=0;j<4;j++){v+=noise3(p)*a;p=p*2.02+vec3(7.1,3.7,5.3);a*=.48;}return v;}
`;
