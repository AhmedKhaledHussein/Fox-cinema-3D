import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {movies} from '../public/catalog.js';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'..','public');

test('V6 includes a local, film-specific artwork for EVERY catalogue entry',()=>{
 assert.ok(movies.length>=35,`35+ movies expected, got ${movies.length}`);
 assert.equal(new Set(movies.map(m=>m.id)).size,movies.length,'movie IDs must be unique');
 for(const m of movies){
  const local=path.join(root,'assets','posters',`${m.id}.webp`);
  assert.ok(fs.existsSync(local),`${m.id}: missing local art`);
  assert.ok(fs.statSync(local).size>5000,`${m.id}: local art too small`);
  assert.ok(m.arabic?.length>1,`${m.id}: missing Arabic title`);
  assert.ok(m.posterSource?.startsWith('https://'),`${m.id}: poster/release source missing`);
 }
});

test('Offer cards contain decorative-only visuals, not baked-in copy',()=>{
 for(const file of ['offer-bank-original.svg','offer-ladies-original.svg']){
  const svg=fs.readFileSync(path.join(root,'assets',file),'utf8');
  assert.match(svg,/<svg/);assert.doesNotMatch(svg,/<text\b/i);
  assert.doesNotMatch(svg,/BUY 1|LADIES|BANK OFFER/i);
 }
});

test('Arabic headings have a dedicated editorial font and CSS scroll motion',()=>{
 const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
 assert.match(css,/family=Alexandria/);
 assert.match(css,/family=Aref\+Ruqaa/);
 assert.match(css,/fox-word-inner/);
 assert.match(css,/prefers-reduced-motion/);
});

test('Cinema auditorium offers a local film-specific first paint and lighting upgrades',()=>{
 const src=fs.readFileSync(path.join(root,'hall3d.js'),'utf8');
 assert.match(src,/localArt=`\/assets\/posters/);
 assert.match(src,/this\.hasOfficialScreen/);
 assert.match(src,/hash31/);
 assert.match(src,/Floor-level aisle lighting/);
});
