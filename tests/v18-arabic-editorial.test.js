import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
const app=get('public/app.js'),css=get('public/styles.css');
test('Arabic home sections use two consistently aligned faces',()=>{
 for(const [section,first,last] of [['MOVIES','يعرض','الآن'],['WAYS TO WATCH','طرق','المشاهدة'],['FOX CINEMA','جولة','في السينما'],['OFFERS','أفضل','العروض'],['LOCATIONS','دور','السينما']])
 assert.ok(app.includes(`'${section}':['${first}','${last}']`));
 assert.match(app,/editorial-main/);assert.match(css,/align-items:baseline!important/);
});
test('Lyon word art is isolated with valid vector metadata',()=>{
 for(const [name,word] of [['offers','العروض'],['theater','السينما'],['look','نظرة'],['ahead','مسبقًا']]){
  const svg=get('public/assets/lyon-'+name+'.svg');
  assert.match(svg,/<svg /);assert.match(svg,/viewBox="[^"]+"/);
  assert.ok(svg.includes('aria-label="'+word+'"'));
 }
 assert.match(css,/@media\(forced-colors:active\)/);
});
test('Food photo no longer has a generated FOX CINEMA overlay',()=>{
 assert.match(app,/food-art original-food-art/);
 assert.match(css,/\.food-banner \.food-art\.original-food-art::after\{content:none!important;display:none!important\}/);
});
test('Other Arabic detail headings are paired while English remains unchanged',()=>{
 assert.match(app,/أفضل <em>العروض<\/em>/);
 assert.match(app,/دور <em>السينما<\/em>/);
 assert.match(app,/اطلب وجباتك<\/span><em>مسبقًا<\/em>/);
 assert.match(app,/Our <em>cinemas<\/em>/);
 assert.match(app,/Order your snacks <em>ahead<\/em>/);
});
