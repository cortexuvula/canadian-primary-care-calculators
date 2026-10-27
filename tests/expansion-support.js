import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registry,summary} from '../src/registry.js';
import {InputError} from '../src/engine.js';
import {initial,transition,currentSnapshot} from '../src/state.js';
export function moduleTests(id, cases, unsupported=[], tolerance=1e-8) {
 test(`${id}: reference vectors and metadata`,()=>{
  const d=registry.find(d=>d.id===id);assert.ok(d,`Missing calculator ${id}`);
  assert.ok(d.vectors.length>=2);
  for(const v of cases){const r=d.calculate(v.inputs);for(const [k,n] of Object.entries(v.expected))assert.ok(Math.abs(r[k]-n)<=tolerance,`${id}.${k}: ${r[k]} != ${n}`);if(v.band)assert.equal(r.band,v.band);assert.doesNotMatch(summary(d,r),/NaN|Infinity|undefined/);}
 });
 test(`${id}: every required answer and numeric guard`,()=>{
  const d=registry.find(d=>d.id===id);assert.ok(d,`Missing calculator ${id}`);const good=cases[0].inputs;
  for(const f of d.inputs){if(!f.optional)assert.throws(()=>d.calculate({...good,[f.id]:''}),e=>e instanceof InputError&&e.field===f.id,`missing ${f.id}`);
   if(f.type==='number')for(const bad of ['-1','0','NaN','Infinity','1e309','bad',null,{}])assert.throws(()=>d.calculate({...good,[f.id]:bad}),e=>e instanceof InputError&&e.field===f.id,`invalid ${f.id} ${bad}`);
   else assert.throws(()=>d.calculate({...good,[f.id]:'bogus'}),e=>e instanceof InputError&&e.field===f.id);
  }
  for(const [field,value,errorField=field]of unsupported)assert.throws(()=>d.calculate({...good,[field]:value}),e=>e instanceof InputError&&e.field===errorField);
 });
 test(`${id}: all fields invalidate snapshots; reset has no clinical defaults`,()=>{
  const d=registry.find(d=>d.id===id);assert.ok(d,`Missing calculator ${id}`);let s=initial(d);
  assert.ok(Object.values(s.draft).every(v=>v===''));
  for(const [field,value]of Object.entries(cases[0].inputs))s=transition(d,s,{type:'edit',field,value});
  s=transition(d,s,{type:'calculate'});assert.ok(currentSnapshot(d,s));
  for(const f of d.inputs)assert.equal(currentSnapshot(d,transition(d,s,{type:'edit',field:f.id,value:''})),null);
  assert.equal(currentSnapshot(d,transition(d,s,{type:'reset'})),null);
 });
}
