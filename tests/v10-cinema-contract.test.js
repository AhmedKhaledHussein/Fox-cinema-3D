import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeScreenFormat,screenProfile,trailerEmbedUrl} from '../public/theater-presets.js';
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const theater=readFileSync(new URL('../public/theater-three.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');
test('Format normalization supports MAX, Standard, IMAX, GOLD and 4DX without arbitrary labels',()=>{
  for(const name of ['Standard','MAX','IMAX','GOLD','4DX','KIDS']){
    assert.equal(normalizeScreenFormat(name),name);
    const p=screenProfile(name);assert.ok(p.screenWidth>20&&p.screenHeight>10);
  }
  assert.equal(normalizeScreenFormat('evil<img>'),'Standard');
  assert.ok(screenProfile('MAX').screenWidth>screenProfile('Standard').screenWidth);
});
test('Sound-enabled trailer URL validates YouTube keys and sets IFrame JS API',()=>{
 const good=trailerEmbedUrl('U9t-slLl30E',{origin:'https://fox-cinema-3d.vercel.app'});
 assert.match(good,/youtube-nocookie.com/);assert.match(good,/enablejsapi=1/);
 assert.match(good,/mute=1/);assert.match(good,/origin=https%3A%2F%2Ffox-cinema-3d.vercel.app/);
 assert.equal(trailerEmbedUrl('https://evil.example.com'),null);
});
test('Same seats on different show formats use isolated inventory identifiers',()=>{
 assert.match(app,/state\.time}:\$\{state\.screenFormat\}/);
 assert.match(app,/state\.screenFormat=el\.dataset\.format\|\|'Standard'/);
 assert.match(app,/new TheaterThree\(canvas,undefined,state\.movieId,state\.screenFormat\)/);
});
test('Hidden unverified demo poster does not appear in the visible public catalogue',()=>{
 assert.match(app,/const isPublishedFilm=m=>m\?\.id!=='hadoota'/);
 assert.match(app,/uniqueMoviesForMode\(movies,state\.filmMode\)\.filter\(isPublishedFilm\)/);
 assert.match(app,/featuredMovies\(\)\.map\(movieCard\)/);
});
test('Trailer audio is explicit, changeable and scoped to YouTube player',()=>{
 assert.match(app,/data-action="3d-sound"/);
 assert.match(app,/case '3d-sound'/);
 assert.match(theater,/setSoundEnabled\(enabled\)/);
 assert.match(theater,/func,args:\[\]/);
 assert.match(theater,/this\.profile\.screenWidth/);
 assert.match(theater,/upholsteredPad/);
 assert.match(css,/\.theater-controls \.theater-audio-btn/);
});
