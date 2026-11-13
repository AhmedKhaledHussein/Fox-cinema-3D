import test from 'node:test';
import assert from 'node:assert/strict';
import {movies,formats,cinemas,offers} from '../public/catalog.js';
import {dict,uiText,genreArabic} from '../public/i18n.js';

test('curated movies have correct categories, Arabic names and external promotional poster sources',()=>{
 assert.ok(movies.length>=14);
 assert.ok(movies.some(m=>m.coming));
 assert.ok(movies.some(m=>m.language==='Arabic'));
 for(const m of movies){
   assert.ok(m.arabic&&m.storyArabic,`localized ${m.id}`);
   assert.ok(m.posterSource.startsWith('https://'),`source ${m.id}`);
   assert.ok(!/poster-.*\.jpg/i.test(m.poster),`no video-captured poster ${m.id}`);
   if(m.posterUrl)assert.match(m.posterUrl,/^https:\/\//);
 }
});
test('Arabic translations are present in core UI sections and catalogue',()=>{
 for(const s of ['Movies','Cinemas','Now showing','Book tickets','Search FOX','Payment','First name','No matching movies. Try adjusting your filters.'])
   assert.notEqual(uiText(s,'ar'),s,`Arabic ${s}`);
 assert.equal(uiText('Movies','en'),'Movies');
 assert.equal(genreArabic.Action,'أكشن');
 assert.ok(Object.keys(dict).length>120);
 assert.ok(formats.every(f=>f.tagAr&&f.featuresAr?.length));
 assert.ok(cinemas.every(c=>c.nameAr&&c.locationAr));
 assert.ok(offers.every(o=>o.nameAr));
});
