import test from 'node:test';
import assert from 'node:assert/strict';
import {Theater3D} from '../public/hall3d.js';

function mockGraphics(){
 const calls={saved:0,restored:0,drawn:0,uploaded:0};
 const ctx={
  save(){calls.saved++},restore(){calls.restored++},clearRect(){},fillRect(){},fillText(){},strokeRect(){},drawImage(){calls.drawn++},
  createLinearGradient(){return {addColorStop(){}}}
 };
 const gl=new Proxy({
  createShader(){return {}},createProgram(){return {}},createBuffer(){return {}},createTexture(){return {}},
  getShaderParameter(){return true},getProgramParameter(){return true},getAttribLocation(){return 0},getUniformLocation(){return {}},
  texImage2D(){calls.uploaded++}
 },{get(target,key){return key in target?target[key]:(()=>{});}});
 const canvas={width:1000,height:700,getContext(kind){return kind==='webgl2'?gl:null},
  getBoundingClientRect(){return {width:1024,height:700}},addEventListener(){},removeEventListener(){},setPointerCapture(){}};
 const restore={window:globalThis.window,document:globalThis.document,Image:globalThis.Image,requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame};
 globalThis.document={createElement(tag){assert.equal(tag,'canvas');return {width:0,height:0,getContext(){return ctx}};}};
 globalThis.window={innerWidth:390,devicePixelRatio:1,matchMedia(){return {matches:false}},addEventListener(){},removeEventListener(){}};
 globalThis.Image=class {set src(value){this.url=value}};
 globalThis.requestAnimationFrame=()=>123;
 globalThis.cancelAnimationFrame=()=>{};
 return {ctx,gl,canvas,calls,cleanup(){for(const [key,value] of Object.entries(restore)){
  if(value===undefined)delete globalThis[key];else globalThis[key]=value;
 }}};
}

test('WebGL theater initializes and paints the screen instead of throwing undefined save()',()=>{
 const graphics=mockGraphics();
 try{
  const viewer=new Theater3D(graphics.canvas);
  assert.ok(graphics.calls.saved>=1,'the screen context is used');
  assert.equal(graphics.calls.saved,graphics.calls.restored,'all drawing states restored');
  assert.ok(graphics.calls.uploaded>=2,'screen and MAX textures uploaded');
  assert.match(viewer.artImage.url,/^\/assets\/posters\/godzilla-minus-zero\.webp$/,'movie-specific fallback artwork loads locally first');
  viewer.artImage.complete=true;viewer.artImage.naturalWidth=600;viewer.artImage.naturalHeight=900;
  viewer.artImage.onload();
  assert.ok(graphics.calls.drawn>=2,'poster is composited on theater screen');
  assert.ok(viewer.tween?.isEntrance,'initial preview begins from a raised camera');
  const start=[...viewer.currentEye];
  viewer.frame(viewer.tween.started+850);
  assert.notDeepEqual(viewer.currentEye,start,'camera moves toward the seat over time');
  viewer.frame(viewer.tween.started+1900);
  assert.equal(viewer.tween,null,'the introductory camera flight completes');
  viewer.setSeat('M27');
  assert.equal(viewer.tween.isEntrance,false,'seat changes use a shorter fly-through');
  viewer.dispose();
 }finally{graphics.cleanup()}
});
