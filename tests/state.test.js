import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initial,transition,currentSnapshot} from '../src/state.js';
import {registry} from '../src/registry.js';
const d=registry.find(x=>x.id==='homa1-ir');
function ready(){let s=initial(d);for(const [field,value]of Object.entries(d.vectors[0].inputs))s=transition(d,s,{type:'edit',field,value});return transition(d,s,{type:'calculate'});}
test('initial clinical values blank, no result or inferred choices',()=>{const s=initial(d);assert.deepEqual(Object.values(s.draft),d.inputs.map(()=>''));assert.equal(currentSnapshot(d,s),null);});
test('calculation snapshot is immutable, normalized and revision/model bound',()=>{const s=ready();const r=currentSnapshot(d,s);assert.equal(r.result.ir.toFixed(2),'4.90');assert.ok(Object.isFrozen(r)&&Object.isFrozen(r.inputs)&&Object.isFrozen(r.result));assert.equal(r.inputs.insulin,114);assert.equal(currentSnapshot({...d,version:'different'},s),null);assert.equal(currentSnapshot(registry[0],s),null);assert.equal(currentSnapshot(d,{...s,revision:s.revision+1}),null);});
test('every edit clears result and copy payload synchronously, including eligibility',()=>{for(const f of d.inputs){const s=transition(d,ready(),{type:'edit',field:f.id,value:''});assert.equal(currentSnapshot(d,s),null);assert.equal(s.snapshot,null);assert.match(s.status,/calculate again/);}});
test('reset discards drafts, result, validation and status; selection remains',()=>{const s=transition(d,ready(),{type:'reset'});assert.deepEqual(s.draft,initial(d).draft);assert.equal(s.snapshot,null);assert.deepEqual(s.errors,{});assert.equal(s.id,d.id);});
test('switch starts fresh and cannot reuse another calculator state',()=>{const s=ready();assert.equal(currentSnapshot(registry[0],s),null);assert.throws(()=>transition(registry[0],s,{type:'calculate'}));assert.deepEqual(Object.values(initial(registry[0]).draft),registry[0].inputs.map(()=>''));});
test('validation failure never retains a prior valid result',()=>{let s=transition(d,ready(),{type:'edit',field:'glucose',value:'garbage'});s=transition(d,s,{type:'calculate'});assert.equal(s.snapshot,null);assert.ok(s.errors.glucose);assert.match(s.status,/highlighted/);});
