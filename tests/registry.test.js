import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registry, favourites, searchCatalog, summary} from '../src/registry.js';
test('shipped registry is evidence-complete, category-diverse and stable',()=>{
 assert.equal(new Set(registry.map(x=>x.id)).size,registry.length);
 assert.ok(new Set(registry.map(x=>x.category)).size>=3);
 for(const d of registry) {
  for(const k of ['id','name','category','version','endpoint','method','applicability','validation','clinicalReview','conversion']) assert.ok(typeof d[k]==='string'&&d[k].length>0,`${d.id}:${k}`);
  assert.match(d.clinicalReview,/Clinician decision support — verify applicability and consult the model references/);
  assert.match(d.clinicalReview,/Release review evidence is recorded in the project documentation/);
  assert.doesNotMatch(d.clinicalReview,/pending|not approved|code approved/i);
  assert.ok(d.aliases.length&&d.sources.length&&d.inputs.length&&d.outputs.length&&d.vectors.length);
  assert.equal(new Set(d.inputs.map(x=>x.id)).size,d.inputs.length);
  for(const f of d.inputs) {assert.ok(f.label&&f.unit&&f.help);assert.ok(!('default' in f));if(f.options)assert.ok(f.options.every(x=>x.value&&x.label));}
  for(const o of d.outputs) assert.ok(o.label&&o.unit&&Number.isInteger(o.decimals));
  for(const s of d.sources) {assert.match(s.url,/^https:\/\//);assert.ok(s.title&&s.accessed);}
 }
});
for(const id of ['framingham','homa1-ir','egfr-2021']) test(`${id} registry golden vectors agree at specified presentation precision`,()=>{
 const d=registry.find(x=>x.id===id);assert.ok(d);
 for(const v of d.vectors){const r=d.calculate(v.inputs);for(const [key,expected]of Object.entries(v.expected)){const output=d.outputs.find(x=>x.key===key);assert.equal(r[key].toFixed(output.decimals),expected);}}
});
test('search is trimmed, case-insensitive and category/alias aware',()=>{
 assert.deepEqual(searchCatalog('  InSuLiN  ').map(x=>x.id),['homa1-ir','homa1-b','quicki']);
 assert.equal(searchCatalog('renal')[0].id,'egfr-2021');
 assert.equal(searchCatalog(''),registry);assert.deepEqual(searchCatalog('not-in-catalog'),[]);
});
test('favourites schema permits only deduplicated known ID arrays, never arbitrary records',()=>{
 for(const value of [null,{},'homa1-ir',[{id:'homa1-ir'}],['homa1-ir',37]]) assert.deepEqual(favourites(value),[]);
 assert.deepEqual(favourites(['homa1-ir','bad-id','homa1-ir']),['homa1-ir']);
});
test('copied summary is deterministic, model/unit/warning qualified and excludes raw inputs',()=>{
 const d=registry.find(x=>x.id==='homa1-ir');const r=d.calculate(d.vectors[0].inputs);const text=summary(d,r);
 assert.match(text,/Matthews 1985/);assert.match(text,/4.90 index/);assert.match(text,/19.0 mU\/L/);assert.match(text,/not HOMA2/);
 assert.ok(!text.includes('114'));assert.ok(!text.includes('5.8'));assert.equal(summary(d,r),text);
});
