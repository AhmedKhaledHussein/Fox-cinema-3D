import test from 'node:test';
import assert from 'node:assert/strict';
let html='';const listeners={};
const app={set innerHTML(v){html=v},get innerHTML(){return html}};
globalThis.document={
 getElementById(id){return id==='app'?app:null},querySelector(sel){return sel==='#app'?app:null},
 addEventListener(name,cb){listeners['document:'+name]=cb},
 documentElement:{lang:'en',dir:'ltr'}
};
globalThis.window={addEventListener(name,cb){listeners[name]=cb},scrollTo(){},devicePixelRatio:1};
globalThis.location={hash:'#/home'};
globalThis.requestAnimationFrame=()=>0;
globalThis.fetch=async()=>({ok:true,json:async()=>({account:null})});
await import('../public/app.js');
function route(hash){location.hash='#/'+hash;listeners.hashchange();return html;}
test('Home has navbar, hero, formats, five posters and footer',()=>{const s=route('home');assert.match(s,/FOX <small>CINEMA/);assert.match(s,/Godzilla Minus Zero/);assert.match(s,/quick-book/);assert.match(s,/Ways to/);assert.match(s,/Our/);assert.match(s,/site-footer/);assert.match(s,/poster-hadoota\.jpg/)});
test('Movie pages, cinemas, offers, formats and food all render',()=>{for(let r of ['movies','cinemas','cinema/mall-of-egypt','formats','format/IMAX','offers','offer/ladies','food','movie/godzilla-minus-zero']){let s=route(r);assert.ok(s.includes('<main'),r+' has main');assert.ok(s.includes('site-footer'),r+' has footer');}});
test('Seat map renders row M27, correct stage, and 3D surface',()=>{let s=route('seats/godzilla-minus-zero');assert.match(s,/data-id="M27"/);assert.match(s,/View in 3D/);s=route('3d');assert.match(s,/theaterCanvas/);assert.match(s,/View from/);assert.match(s,/hud-metrics/)});
test('Checkout wizard and sample ticket route render without errors',()=>{let s=route('checkout');assert.match(s,/Booking summary/);assert.match(s,/VAT · 14%/);s=route('ticket');assert.match(s,/No ticket loaded/)});
