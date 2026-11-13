import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sceneMesh} from '../public/hall3d.js';

const root = new URL('../public/', import.meta.url);
test('WebGL theater is a real high-detail batched 3D mesh', () => {
  const mesh=sceneMesh(true);
  assert.ok(mesh instanceof Float32Array);
  assert.equal(mesh.length%27,0);
  assert.ok(mesh.length/27>70000, 'even compact theater needs tangible geometry');
  assert.ok(mesh.every(Number.isFinite), 'GPU vertex data must never contain NaN or Infinity');
  // Each vertex has position, surface color and normal, not a sprite or screenshot.
  for(let i=0;i<mesh.length;i+=9){const l=Math.hypot(mesh[i+6],mesh[i+7],mesh[i+8]);assert.ok(l>.8&&l<1.3);}
});
test('Cinema screen renders movie-specific poster and a fallback before network loading',()=>{
 const src=readFileSync(new URL('hall3d.js',root),'utf8');
 assert.match(src,/this\.drawScreen\(null\)/);
 assert.match(src,/this\.movie\.poster/);
 assert.match(src,/this\.uploadScreen\(\)/);
 assert.match(src,/2048/);
});
test('Motion respects reduced-motion and transitions across hash routes',()=>{
 const js=readFileSync(new URL('app.js',root),'utf8');
 const css=readFileSync(new URL('styles.css',root),'utf8');
 assert.match(js,/document\.startViewTransition/);
 assert.match(js,/prefers-reduced-motion/);
 assert.match(js,/installCinematicMotion/);
 assert.match(css,/fox-route-in/);
 assert.match(css,/fox-screen-enter/);
});
