import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {analyzeScreenPixels,smoothLightSample,structuredCloneSample,localTrailerPath,ScreenFrameProbe,PROBE_INTERVAL_MS} from '../public/screen-lighting.js';

function columns(palettes,width=48,height=27){
 const out=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const rgb=palettes[Math.min(2,Math.floor(x*3/width))];let i=(y*width+x)*4;
  out.set([...rgb,255],i);
 }
 return out;
}
const blank=(lum)=>columns([[lum,lum,lum],[lum,lum,lum],[lum,lum,lum]]);

test('frame probe resolves independent left, centre and right screen colours',()=>{
 const a=analyzeScreenPixels(columns([[255,20,10],[10,200,40],[20,60,255]]),48,27);
 assert.ok(a.zones[0].color[0]>.9 && a.zones[0].color[2]<.1);
 assert.ok(a.zones[1].color[1]>.7 && a.zones[1].color[0]<.1);
 assert.ok(a.zones[2].color[2]>.95 && a.zones[2].color[0]<.1);
 assert.ok(a.global.brightness>0&&a.global.brightness<2);
});
test('dark trailers lower the projected energy; bright scenes raise it',()=>{
 const black=analyzeScreenPixels(blank(2),48,27),white=analyzeScreenPixels(blank(245),48,27);
 assert.ok(white.global.brightness>black.global.brightness*3);
 assert.ok(black.global.brightness<.25);
 assert.ok(white.global.brightness>1.2);
});
test('light transitions ease rather than snapping; reduced-motion slows changes',()=>{
 const low=analyzeScreenPixels(blank(15),48,27);
 const high=analyzeScreenPixels(blank(245),48,27);
 const normal=smoothLightSample(low,high,120,false);
 const safe=smoothLightSample(low,high,120,true);
 assert.ok(normal.global.brightness>low.global.brightness);
 assert.ok(normal.global.brightness<high.global.brightness);
 assert.ok(safe.global.brightness<normal.global.brightness);
 assert.equal(low.global.brightness,structuredCloneSample(low).global.brightness);
});
test('no directory traversal or third-party frame source is admitted',()=>{
 for(const bad of ['https://youtube.com/watch?v=abc','//cdn.com/x.mp4','/assets/trailers/../bad.mp4',
  '/assets/trailers/safe.mp4?token=secret','/assets/other/movie.mp4','/assets/trailers/a.m3u8']){
  assert.equal(localTrailerPath(bad),null,bad);
 }
 assert.equal(localTrailerPath('/assets/trailers/movie-trailer.mp4'),'/assets/trailers/movie-trailer.mp4');
 assert.equal(localTrailerPath('/assets/trailers/official-123.webm'),'/assets/trailers/official-123.webm');
});
test('media probe is throttled and respects video readiness and sampling errors',()=>{
 let n=0;
 const fakeDoc={createElement:()=>({width:0,height:0,getContext:()=>({
  drawImage:()=>{n++;},getImageData:()=>({data:blank(140)})
 })})};
 const probe=new ScreenFrameProbe(fakeDoc);
 const media={tagName:'VIDEO',readyState:2,videoWidth:1920,videoHeight:1080};
 assert.ok(probe.sample(media,1000));
 assert.equal(probe.sample(media,1000+PROBE_INTERVAL_MS-1),null);
 assert.ok(probe.sample(media,1000+PROBE_INTERVAL_MS));
 assert.equal(n,2);
 assert.equal(probe.sample({...media,readyState:1},1400),null);
 const tainted=new ScreenFrameProbe({createElement:()=>({getContext:()=>({drawImage:()=>{throw new Error('tainted');}})})});
 assert.equal(tainted.sample(media,1000),null);
});
test('Three auditorium uses spatial light bounces, no uniform per-seat emissive glow',()=>{
 const src=fs.readFileSync(new URL('../public/theater-three.js',import.meta.url),'utf8');
 assert.match(src,/new THREE\.SpotLight/);
 assert.match(src,/this\.sideSpills=\[left,right\]/);
 assert.match(src,/this\.projectors\[0\]\.color\.lerp\(left/);
 assert.match(src,/this\.projectors\[1\]\.color\.lerp\(right/);
 assert.match(src,/this\.screenHalo=halo/);
 assert.match(src,/this\.screenSpill\.color\.lerp/);
 assert.match(src,/this\.frameProbe\.sample\(this\.trailerLocalVideo/);
 assert.match(src,/new THREE\.VideoTexture\(video\)/);
 assert.match(src,/this\.screenFadeState/);
 assert.match(src,/this\.movie\.trailerVideoUrl/);
 assert.match(src,/this\.lightMode='youtube-artwork'/);
 assert.doesNotMatch(src,/m\.emissiveIntensity\s*=\.045/);
 assert.match(src,/document\.visibilityState!==['"]hidden['"]/);
});
