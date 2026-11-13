/* FOX CINEMA — self-contained WebGL2 procedural cinema.
   No external runtime libraries, textures beyond user-provided video-derived assets.
   A real perspective 3D geometry scene, not a flat screenshot or CSS projection. */
import {layout, getSeat, getMovie} from './catalog.js';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function shader(gl,type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
function program(gl,vert,frag){const p=gl.createProgram();gl.attachShader(p,shader(gl,gl.VERTEX_SHADER,vert));gl.attachShader(p,shader(gl,gl.FRAGMENT_SHADER,frag));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;}
function norm(v){let d=Math.hypot(...v)||1;return v.map(n=>n/d)}
function minus(a,b){return a.map((x,i)=>x-b[i])}
function dot(a,b){return a.reduce((t,v,i)=>t+v*b[i],0)}
function cross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
function lookAt(eye,target){const z=norm(minus(eye,target));let x=norm(cross([0,1,0],z));let y=cross(z,x);return [x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]}
function perspective(fovy,aspect,near,far){const f=1/Math.tan(fovy/2),n=1/(near-far);return [f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*n,-1,0,0,2*far*near*n,0]}
function matMul(a,b){const out=new Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out}
const C={wall:[.25,.046,.065],redPanel:[.38,.057,.085],carpet:[.083,.075,.09],floor:[.105,.103,.119],riser:[.13,.126,.146],chair:[.058,.058,.066],cushion:[.105,.11,.12],premium:[.13,.13,.15],regular:[.22,.07,.085],metal:[.4,.42,.46],rail:[.52,.55,.57],glow:[.42,.9,.6],lamp:[.8,.7,.54],screenBorder:[.16,.17,.2]};
// Cinema showroom mesh: rounded upholstery, true curved normals, metal cup holders and aisle lighting.
// Deliberately self-contained: a single batched draw call keeps the 306-seat hall fast on Safari.
export function sceneMesh(lowDetail=false){
 const vertices=[];
 const add=(p,n,color)=>vertices.push(...p,...color,...n);
 function triangle(a,b,c,n,color,normals){const ns=normals||[n,n,n];add(a,ns[0],color);add(b,ns[1],color);add(c,ns[2],color);}
 function quad(a,b,c,d,n,color){triangle(a,b,c,n,color);triangle(a,c,d,n,color);}
 function box(x,y,z,w,h,d,color){const x0=x-w/2,x1=x+w/2,y0=y-h/2,y1=y+h/2,z0=z-d/2,z1=z+d/2;
  quad([x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],[0,0,1],color);
  quad([x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],[0,0,-1],color);
  quad([x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],[-1,0,0],color);
  quad([x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[1,0,0],color);
  quad([x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0],[0,1,0],color);
  quad([x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1],[0,-1,0],color);
 }
 function pillow(cx,cy,cz,rx,ry,rz,color,slices=12,stacks=7){
  if(lowDetail){slices=Math.max(7,Math.round(slices*.65));stacks=Math.max(4,Math.round(stacks*.67));}
  const point=(u,t)=>{const a=u*2*Math.PI,b=t*Math.PI;return [cx+rx*Math.sin(b)*Math.cos(a),cy+ry*Math.cos(b),cz+rz*Math.sin(b)*Math.sin(a)];};
  const normal=p=>norm([(p[0]-cx)/Math.max(rx*rx,.0001),(p[1]-cy)/Math.max(ry*ry,.0001),(p[2]-cz)/Math.max(rz*rz,.0001)]);
  for(let i=0;i<slices;i++)for(let j=0;j<stacks;j++){
   const a=point(i/slices,j/stacks),b=point((i+1)/slices,j/stacks),c=point((i+1)/slices,(j+1)/stacks),d=point(i/slices,(j+1)/stacks);
   triangle(a,b,c,null,color,[normal(a),normal(b),normal(c)]);triangle(a,c,d,null,color,[normal(a),normal(c),normal(d)]);
  }
 }
 function rod(a,b,r,color,sides=7){const axis=norm(minus(b,a)),helper=Math.abs(axis[1])<.88?[0,1,0]:[1,0,0];const side=norm(cross(axis,helper)),up=norm(cross(axis,side));
  const at=(p,t)=>p.map((n,i)=>n+side[i]*Math.cos(t)*r+up[i]*Math.sin(t)*r);
  for(let i=0;i<sides;i++){
   const t=i*2*Math.PI/sides,u=(i+1)*2*Math.PI/sides;
   const p=at(a,t),q=at(a,u),v=at(b,u),w=at(b,t);
   const n1=norm(minus(p,a)),n2=norm(minus(q,a));
   triangle(p,q,v,null,color,[n1,n2,n2]);triangle(p,v,w,null,color,[n1,n2,n1]);
  }
 }
 function ring(x,y,z,r,color){const sides=13;for(let k=0;k<sides;k++){
  const t=k*2*Math.PI/sides,u=(k+1)*2*Math.PI/sides;
  const a=[x+r*Math.cos(t),y,z+r*Math.sin(t)],b=[x+r*Math.cos(u),y,z+r*Math.sin(u)],c=[b[0],y-.045,b[2]],d=[a[0],y-.045,a[2]];
  quad(a,b,c,d,[0,1,0],color);
  }}
 // Dark stepped architecture; screen plane is independent and has a full resolution movie texture.
 box(0,5.55,-5.7,29.6,12.35,.55,[.020,.021,.025]);
 box(-14.98,5.8,17,.42,17.4,50,[.235,.034,.051]);
 box(14.98,5.8,17,.42,17.4,50,[.235,.034,.051]);
 box(0,12.7,17,30,.36,50,[.035,.033,.040]);
 box(0,-.65,19,29.7,.45,51,[.057,.056,.062]);
 // Ceiling acoustic ribs with soft warm fixtures.
 for(let i=0;i<10;i++){
  const z=-2.6+i*4.85;
  box(0,12.55,z,30,.54,.59,[.043,.044,.051]);
  box(0,12.17,z+.33,27.6,.055,.09,[.085,.073,.076]);
  for(let x=-11.4;x<=11.5;x+=5.7){
   box(x,12.20,z+.34,.33,.10,.22,[.83,.68,.47]);
   box(x,12.08,z+.34,.16,.065,.12,[1.00,.83,.57]);
  }
 }
 // Red, fabric-covered acoustic panels with edge trims and underlit baseboards.
 for(let side of [-1,1]){
  const x=side*14.70;
  for(let z=-.7;z<44;z+=3.95){
   box(x,6.0,z,.18,9.9,3.85,[.31,.038,.055]);
   box(x-side*.15,6.15,z+1.9,.07,10.3,.09,[.62,.115,.135]);
   box(x-side*.22,2.1,z,.075,.12,3.85,[.16,.13,.15]);
  }
  // Large inset backlit branding panel.
  box(side*14.42,7.4,5.3,.28,5.35,6.15,[.038,.045,.052]);
  for(let z of [2.19,8.41])box(side*14.23,7.4,z,.1,5.37,.052,[.87,.35,.33]);
  for(let y of [4.7,10.08])box(side*14.25,y,5.3,.1,.055,6.27,[.87,.35,.33]);
  for(let z of [1.8,16.2,29.5,39.3]){
   box(side*14.40,6.5,z,.66,1.96,1.13,[.022,.023,.027]);
   box(side*14.02,6.5,z,.16,1.55,.95,[.06,.06,.066]);
  }
  // Red wall sconce-like soft boxes and ground-level exit markers.
  for(let z of [3,19,35]){box(side*14.25,9.6,z,.21,.34,1.0,[.68,.16,.15]);}
  box(side*13.45,1.42,34,.12,.45,1.05,[.08,.45,.19]);
 }
 // Tiered risers with slim step lights and tactile carpet center aisle.
 for(let r=0;r<13;r++){
  const z=5+r*2.15,y=r*.31;
  box(0,y-.25,z,28.55,.45,2.14,[.068,.067,.074]);
  box(0,y-.45,z-1.045,28.55,.075,.09,[.17,.15,.16]);
  for(let x of [-8.35,8.35]){
   box(x,y-.01,z,1.42,.055,2.01,[.085,.085,.091]);
   box(x,y+.025,z-1.02,1.23,.035,.075,[.17,.29,.19]);
   for(let n of [-.37,.37])box(x+n,y+.027,z-.98,.34,.035,.048,[.40,.67,.43]);
  }
 }
 // Stage and cinema screen housing with thin warm silver trim.
 box(0,.54,-2.0,27,1.08,2.65,[.043,.043,.048]);
 box(0,1.13,-2.4,26,.065,.16,[.33,.34,.32]);
 box(0,6.56,-4.47,25.1,10.72,.55,[.11,.125,.14]);
 box(0,6.56,-4.15,23.35,9.66,.11,[.012,.013,.017]);
 for(let side of [-1,1])box(side*12.98,6.6,-3.8,.52,10.56,.58,[.039,.03,.039]);
 // Brushed steel guardrails; cylindrical geometry creates physically credible specular contours.
 const rail=[.41,.46,.48];
 for(let z of [11.35,20.8,29.5])for(let side of [-1,1]){
  const x=side*7.72,h=1.55+(z-5)*.14;
  rod([x,h,z],[x,h,z+4.1],.050,rail);
  rod([x,h-.62,z],[x,h-.62,z+4.1],.024,[.30,.34,.37]);
  for(let zz=z;zz<=z+4.1;zz+=1.35)rod([x,h-1.43,zz],[x,h,zz],.035,rail);
 }
 // Row-level handrail beside stage for the distinctive horizontal theater sightlines.
 for(let x=-13.5;x<13.5;x+=2.7){
  rod([x,1.19,-1.35],[x+2.7,1.19,-1.35],.030,[.32,.36,.38]);
  rod([x,1.19,-1.35],[x,.36,-1.35],.023,[.28,.32,.36]);
 }
 // Upholstery: 5 individually smooth layers per seat; not sharp polyhedra or a flat seat icon.
 for(const s of layout){
  const {x,z,y}=s,premium=s.type==='Premium';
  const width=premium?.94:.80;
  const shell=premium?[.080,.085,.090]:[.100,.055,.064];
  const leather=premium?[.113,.119,.129]:[.137,.085,.091];
  const upper=premium?[.143,.147,.160]:[.165,.104,.111];
  const piping=premium?[.185,.188,.203]:[.205,.112,.116];
  // Backrest outer rounded shell and brighter center upholstery, visible from the audience.
  pillow(x,y+1.13,z+.29,width*.50,.72,.23,shell,14,9);
  pillow(x,y+1.12,z+.48,width*.44,.58,.077,leather,12,7);
  pillow(x,y+1.63,z+.37,width*.43,.225,.16,upper,12,6);
  // Headrest seam and edge reflect soft projection light.
  rod([x-width*.36,y+1.47,z+.512],[x+width*.36,y+1.47,z+.512],.012,piping,5);
  // Sculpted seat base and forward leg support.
  pillow(x,y+.62,z-.25,width*.47,.155,.47,leather,12,6);
  pillow(x,y+.47,z-.66,width*.43,.14,.18,shell,9,5);
  // Richly padded independent armrests and silver inner cupholder detail.
  for(const side of [-1,1]){
   const px=x+side*width*.60;
   box(px,y+.52,z+.08,.13,.55,.96,[.045,.047,.051]);
   pillow(px,y+.79,z-.10,.145,.125,.53,upper,9,5);
   if(!lowDetail)ring(px,y+.885,z-.39,.083,[.50,.53,.56]);
   box(px,y+.17,z+.36,.12,.36,.13,[.045,.048,.052]);
  }
  if(premium){pillow(x,y+.34,z-.82,width*.42,.11,.29,leather,9,5);}
 }
 return new Float32Array(vertices);
}
function makeScreenCanvas(){const c=document.createElement('canvas');c.width=2048;c.height=930;return {canvas:c,ctx:c.getContext('2d',{alpha:false})};}
function makeMaxCanvas(){const c=document.createElement('canvas');c.width=1024;c.height=560;const x=c.getContext('2d');x.fillStyle='#12141a';x.fillRect(0,0,c.width,c.height);x.strokeStyle='#d65b61';x.lineWidth=11;x.strokeRect(20,20,984,520);x.fillStyle='#c95456';x.textAlign='center';x.font='bold 215px Arial';x.fillText('MAX',512,330);x.fillStyle='#aa9d8d';for(let i=0;i<18;i++)x.fillRect(115+(i*63)%795,394+Math.floor(i/9)*40,34,4);return c}
function createTexture(gl,canvas){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,canvas);return t}
function texturedQuad(corners){const [a,b,c,d]=corners;const arr=[];for(const [p,uv] of [[a,[0,0]],[b,[1,0]],[c,[1,1]],[a,[0,0]],[c,[1,1]],[d,[0,1]]])arr.push(...p,...uv);return new Float32Array(arr)}
const shaderV=`attribute vec3 aPosition;attribute vec3 aColor;attribute vec3 aNormal;uniform mat4 uMVP;uniform vec3 uEye;varying vec3 vColor;varying vec3 vNorm;varying vec3 vWorld;varying float vDist;void main(){gl_Position=uMVP*vec4(aPosition,1.);vColor=aColor;vNorm=aNormal;vWorld=aPosition;vDist=distance(uEye,aPosition);}`;
const shaderF=`precision highp float;varying vec3 vColor;varying vec3 vNorm;varying vec3 vWorld;varying float vDist;uniform vec3 uEye;
void main(){
 vec3 n=normalize(vNorm);vec3 view=normalize(uEye-vWorld);
 vec3 ceiling=normalize(vec3(.22,.90,.32));
 vec3 projector=normalize(vec3(-vWorld.x*.035,.12,-1.));
 float warm=max(dot(n,ceiling),0.);
 float screen=max(dot(n,projector),0.);
 float red=max(dot(n,normalize(vec3(-.7,.16,.5))),0.);
 float hemi=.45+.27*n.y;
 vec3 lighting=vec3(.34,.36,.41)*hemi+vec3(.40,.38,.34)*warm*.65+vec3(.30,.40,.53)*screen*.35+vec3(.14,.045,.055)*red;
 vec3 reflected=normalize(ceiling+view);
 float spec=pow(max(dot(n,reflected),0.),42.)*.15+pow(max(dot(n,normalize(projector+view)),0.),16.)*.035;
 vec3 c=vColor*lighting+vec3(.69,.71,.75)*spec;
 float fog=clamp((vDist-22.)/72.,0.,.27);
 c=mix(c,vec3(.018,.018,.021),fog);
 gl_FragColor=vec4(pow(max(c,0.),vec3(.91)),1.);
}`;
const texV=`attribute vec3 aPosition;attribute vec2 aUV;uniform mat4 uMVP;varying vec2 vUV;void main(){gl_Position=uMVP*vec4(aPosition,1.);vUV=aUV;}`;
const texF=`precision mediump float;varying vec2 vUV;uniform sampler2D uTexture;void main(){gl_FragColor=texture2D(uTexture,vUV);}`;
export class Theater3D{
 constructor(canvas,onReady,movieId='godzilla-minus-zero'){this.movie=getMovie(movieId);this.canvas=canvas;this.disposed=false;this.selected='G9';this.yaw=0;this.pitch=0;this.fov=74;this.pointer=null;this.currentEye=null;this.currentTarget=null;this.clock=performance.now();this.dirty=true;this.tween=null;this.entryFlight=true;this.lastSeat=null;
 const gl=canvas.getContext('webgl2',{alpha:false,antialias:true,powerPreference:'high-performance'})||canvas.getContext('webgl',{alpha:false,antialias:true,powerPreference:'high-performance'});if(!gl)throw Error('WebGL is not supported by this browser.');this.gl=gl;
 this.colorProg=program(gl,shaderV,shaderF);this.texProg=program(gl,texV,texF);
 this.colorBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.colorBuf);const compact=window.innerWidth<720||(navigator.deviceMemory&&navigator.deviceMemory<=4);const mesh=sceneMesh(Boolean(compact));gl.bufferData(gl.ARRAY_BUFFER,mesh,gl.STATIC_DRAW);this.colorCount=mesh.length/9;
 const quad=texturedQuad([[-11.5,2.05,-3.94],[11.5,2.05,-3.94],[11.5,11.15,-3.94],[-11.5,11.15,-3.94]]);
 this.screenBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.screenBuf);gl.bufferData(gl.ARRAY_BUFFER,quad,gl.STATIC_DRAW);
 const maxQuad=texturedQuad([[14.36,5.2,2.55],[14.36,5.2,7.45],[14.36,9.3,7.45],[14.36,9.3,2.55]]);
 this.maxBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.maxBuf);gl.bufferData(gl.ARRAY_BUFFER,maxQuad,gl.STATIC_DRAW);
 const leftMaxQuad=texturedQuad([[-14.36,5.2,7.45],[-14.36,5.2,2.55],[-14.36,9.3,2.55],[-14.36,9.3,7.45]]);this.leftMaxBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.leftMaxBuf);gl.bufferData(gl.ARRAY_BUFFER,leftMaxQuad,gl.STATIC_DRAW);
 const obj=makeScreenCanvas();this.screenCanvas=obj.canvas;this.screenCtx=obj.ctx;this.drawScreen(null);this.screenTex=createTexture(gl,obj.canvas);this.maxTex=createTexture(gl,makeMaxCanvas());
 const image=new Image();image.decoding='async';this.artImage=image;image.onload=()=>{if(this.disposed)return;this.drawScreen(image);this.uploadScreen();};image.onerror=()=>{console.warn('FOX cinema screen poster could not load');};image.src='/assets/'+(this.movie.poster||'poster-godzilla.jpg');
 this.attachInput();this.setSeat(this.selected,false);this.resize();this.raf=requestAnimationFrame(t=>this.frame(t));onReady?.();
 }
 // Movie artwork is painted at 2048px into a real emissive screen texture.
 // The gradient and title exist BEFORE Image.onload, so the cinema never shows an empty blue rectangle.
 drawScreen(image){const c=this.screenCanvas,x=this.screenCtx;if(!c||!x)throw Error('Cinema screen drawing context was not initialized.');const W=c.width,H=c.height;
  x.save();x.clearRect(0,0,W,H);
  const bg=x.createLinearGradient(0,0,W,H);bg.addColorStop(0,'#0c1823');bg.addColorStop(.52,'#122d46');bg.addColorStop(1,'#10121b');x.fillStyle=bg;x.fillRect(0,0,W,H);
  if(image&&image.complete&&image.naturalWidth){
   // Deep blurred giant artwork behind the movie typography — like the reference recording.
   x.save();x.filter='blur(10px) saturate(1.12) contrast(1.08)';x.globalAlpha=.70;
   const scale=Math.max(W/image.naturalWidth,H/image.naturalHeight);const w=image.naturalWidth*scale,h=image.naturalHeight*scale;
   x.drawImage(image,(W-w)*.5,(H-h)*.46,w,h);x.restore();
   const overlay=x.createLinearGradient(0,0,W,0);overlay.addColorStop(0,'rgba(0,6,13,.92)');overlay.addColorStop(.54,'rgba(2,11,22,.48)');overlay.addColorStop(1,'rgba(4,9,15,.40)');x.fillStyle=overlay;x.fillRect(0,0,W,H);
   // High-detail upright movie one-sheet at the right.
   const ph=H*.83,pw=ph*image.naturalWidth/image.naturalHeight,px=W*.71,py=(H-ph)*.5;
   x.shadowBlur=62;x.shadowColor='#000a';x.fillStyle='#06121d';x.fillRect(px-13,py-13,pw+26,ph+26);x.shadowBlur=0;
   x.drawImage(image,px,py,pw,ph);
  }
  x.textBaseline='top';x.shadowColor='rgba(0,0,0,.6)';x.shadowBlur=18;
  x.font='600 33px Arial,sans-serif';x.fillStyle='#c5d0d7';x.fillText('NOW SHOWING AT FOX CINEMA',115,H*.33);
  x.font='bold 91px Arial,sans-serif';x.fillStyle='#f3f4f5';
  const title=(this.movie.title||'NOW SHOWING').toUpperCase(),words=title.split(' '),lines=[];let current='';
  for(const word of words){if((current+' '+word).length>17&&current){lines.push(current);current=word;}else current=(current+' '+word).trim();}if(current)lines.push(current);
  lines.slice(0,3).forEach((line,i)=>x.fillText(line,110,H*.41+i*105));
  x.shadowBlur=0;x.fillStyle='#e9edf2';x.font='bold 25px Arial,sans-serif';x.textAlign='right';x.fillText(this.movie.id==='godzilla-minus-zero'?'FILMED FOR IMAX':'FOX CINEMA · NOW SHOWING',W-82,58);
  x.restore();
 }
 uploadScreen(){const gl=this.gl;gl.bindTexture(gl.TEXTURE_2D,this.screenTex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,this.screenCanvas);}
 // The source recording enters the auditorium from a high, wide overview before
 // easing towards the selected seat. Changing seats uses a shorter seated fly-through.
 setSeat(id,immediate=false){
  const seat=getSeat(id);if(!seat)return;
  const prefersReduced=typeof window.matchMedia==='function'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const eye=[seat.x,seat.y+2.15,seat.z+.12],look=[0,6.4,-3.94];
  this.selected=id;this.destEye=eye;this.destTarget=look;
  if(!this.currentEye){
   this.currentEye=[0,21.8,36.5];this.currentTarget=[0,4.6,8.5];this.fov=82;
  }
  if(immediate||prefersReduced){
   this.currentEye=[...eye];this.currentTarget=[...look];this.tween=null;this.entryFlight=false;
  }else{
   this.tween={fromEye:[...this.currentEye],fromTarget:[...this.currentTarget],toEye:eye,toTarget:look,
    started:performance.now(),duration:this.entryFlight?1650:1050,fromFov:this.fov,toFov:74,
    isEntrance:this.entryFlight};
  }
  this.yaw=0;this.pitch=0;this.lastSeat=id;
 }

 resize(){const rect=this.canvas.getBoundingClientRect();const dpr=Math.min(window.devicePixelRatio||1,2.2);const w=Math.max(1,Math.floor(rect.width*dpr));const h=Math.max(1,Math.floor(rect.height*dpr));if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;this.gl.viewport(0,0,w,h);}}
 attachInput(){this.down=e=>{if(e.button!==0)return;this.pointer=[e.clientX,e.clientY];this.canvas.setPointerCapture(e.pointerId)};this.move=e=>{if(!this.pointer)return;const dx=e.clientX-this.pointer[0],dy=e.clientY-this.pointer[1];this.yaw=clamp(this.yaw+dx*.003,-.75,.75);this.pitch=clamp(this.pitch-dy*.003,-.5,.5);this.pointer=[e.clientX,e.clientY]};this.up=()=>this.pointer=null;this.wheel=e=>{e.preventDefault();this.fov=clamp(this.fov+e.deltaY*.021,45,100)};this.canvas.addEventListener('pointerdown',this.down);this.canvas.addEventListener('pointermove',this.move);this.canvas.addEventListener('pointerup',this.up);this.canvas.addEventListener('pointercancel',this.up);this.canvas.addEventListener('wheel',this.wheel,{passive:false});this.onResize=()=>this.resize();window.addEventListener('resize',this.onResize);}
 reset(){this.yaw=0;this.pitch=0;if(!this.tween)this.fov=74}
 frame(t){if(this.disposed)return;const gl=this.gl;this.resize();const dt=clamp((t-this.clock)/1000,.001,.05);this.clock=t;
 if(this.tween){
  const tw=this.tween;const progress=clamp((t-tw.started)/tw.duration,0,1);
  const smooth=progress<.5?4*progress*progress*progress:1-Math.pow(-2*progress+2,3)/2;
  for(let i=0;i<3;i++){
   const rise=tw.isEntrance?0:.55*Math.sin(Math.PI*progress);
   this.currentEye[i]=tw.fromEye[i]+(tw.toEye[i]-tw.fromEye[i])*smooth+(i===1?rise:0);
   this.currentTarget[i]=tw.fromTarget[i]+(tw.toTarget[i]-tw.fromTarget[i])*smooth;
  }
  this.fov=tw.fromFov+(tw.toFov-tw.fromFov)*smooth;
  if(progress===1){this.tween=null;this.entryFlight=false;}
 }else{
  for(let i=0;i<3;i++)this.currentEye[i]+=(this.destEye[i]-this.currentEye[i])*(1-Math.exp(-dt*5));
 }
 const center=this.currentTarget||[0,6.4,-3.94];
 const target=[center[0]+Math.sin(this.yaw)*13,center[1]+Math.sin(this.pitch)*11,center[2]+(1-Math.cos(this.yaw))*7];
 const view=lookAt(this.currentEye,target),proj=perspective(this.fov*Math.PI/180,this.canvas.width/this.canvas.height,.09,150),mvp=matMul(proj,view);
 gl.clearColor(.01,.011,.014,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.disable(gl.BLEND);
 gl.useProgram(this.colorProg);gl.uniformMatrix4fv(gl.getUniformLocation(this.colorProg,'uMVP'),false,new Float32Array(mvp));gl.uniform3fv(gl.getUniformLocation(this.colorProg,'uEye'),new Float32Array(this.currentEye));gl.bindBuffer(gl.ARRAY_BUFFER,this.colorBuf);const stride=36;for(const [attr,sz,off] of [['aPosition',3,0],['aColor',3,12],['aNormal',3,24]]){let loc=gl.getAttribLocation(this.colorProg,attr);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,sz,gl.FLOAT,false,stride,off);}gl.drawArrays(gl.TRIANGLES,0,this.colorCount);
 gl.useProgram(this.texProg);gl.uniformMatrix4fv(gl.getUniformLocation(this.texProg,'uMVP'),false,new Float32Array(mvp));const ap=gl.getAttribLocation(this.texProg,'aPosition'),au=gl.getAttribLocation(this.texProg,'aUV');for(let [buf,tex] of [[this.screenBuf,this.screenTex],[this.maxBuf,this.maxTex],[this.leftMaxBuf,this.maxTex]]){gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.enableVertexAttribArray(ap);gl.vertexAttribPointer(ap,3,gl.FLOAT,false,20,0);gl.enableVertexAttribArray(au);gl.vertexAttribPointer(au,2,gl.FLOAT,false,20,12);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1i(gl.getUniformLocation(this.texProg,'uTexture'),0);gl.drawArrays(gl.TRIANGLES,0,6);}
 this.raf=requestAnimationFrame(time=>this.frame(time));}
 dispose(){this.disposed=true;cancelAnimationFrame(this.raf);this.canvas.removeEventListener('pointerdown',this.down);this.canvas.removeEventListener('pointermove',this.move);this.canvas.removeEventListener('pointerup',this.up);this.canvas.removeEventListener('pointercancel',this.up);this.canvas.removeEventListener('wheel',this.wheel);window.removeEventListener('resize',this.onResize);const gl=this.gl;for(const b of [this.colorBuf,this.screenBuf,this.maxBuf,this.leftMaxBuf])gl.deleteBuffer(b);for(const t of [this.screenTex,this.maxTex])gl.deleteTexture(t);gl.deleteProgram(this.colorProg);gl.deleteProgram(this.texProg);}
}
