import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');
const art=readFileSync(new URL('../public/assets/lyon-arabic-now.svg',import.meta.url),'utf8');
test('movie detail cinema filter defaults independently to All cinemas',()=>{
 assert.match(app,/detailCinemaId:'all'/);
 assert.match(app,/detailMovieId!==id/);
 assert.match(app,/state\.detailCinemaId==='all'\?cinemas/);
 assert.match(app,/case 'detail-cinema':state\.detailCinemaId=id/);
 assert.match(app,/state\.cinemaId=el\.dataset\.cinema/);
});
test('Arabic NOW headline art is isolated and text stays accessible',()=>{
 assert.match(app,/arabic-now-lyon/);
 assert.match(css,/lyon-arabic-now\.svg/);
 assert.match(art,/aria-label="الآن"/);
});
