import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registry,summary,favourites,searchCatalog} from '../src/registry.js';
import {initial,transition} from '../src/state.js';
import {inputGroups} from '../src/ui-groups.js';
import {raw,inputs} from './batch-a-support.js';
for(const id of ['urine-acr','urine-pcr'])test(`Batch A ${id} selected conventional unit leads qualified copy`,()=>{
 const d=registry.find(d=>d.id===id),result=d.calculate({...inputs(id,raw.vectors[id].valid[0].inputs),outputUnit:'mg/g'});
 const lines=summary(d,result).split('\n');assert.match(lines[3],id==='urine-acr'?/^ACR: 27 mg\/g$/:/^PCR: 265 mg\/g$/);
});
test('Batch A adds exactly eleven real modules, preserving the fifteen baseline IDs',()=>{
 assert.equal(registry.length,26);
 assert.deepEqual(registry.slice(15).map(d=>d.id),Object.keys(raw.vectors));
});
for(const [id,data]of Object.entries(raw.vectors))test(`Batch A registry ${id}: full presentation, deliberate inputs, copy and groups`,()=>{
 const d=registry.find(d=>d.id===id);assert.ok(d,'real discoverable module');
 assert.equal(searchCatalog(d.aliases[0]).includes(d),true);assert.deepEqual(favourites([id]),[id]);
 assert.deepEqual(inputGroups[id].flatMap(([,ids])=>ids),d.inputs.map(f=>f.id));
 assert.equal(d.vectors.length,data.valid.length);
 for(const v of d.vectors){const result=d.calculate(v.inputs);for(const [k,display]of Object.entries(v.expected)){assert.equal(result[k].toFixed(d.outputs.find(o=>o.key===k).decimals),display);}
  const text=summary(d,result);assert.match(text,/Clinician decision support/);assert.ok(text.includes(d.version));assert.ok(text.includes(d.applicability));
 }
 for(const f of d.inputs){const s=initial(d);assert.equal(s.draft[f.id],'');const draft={...inputs(id,data.valid[0].inputs),[f.id]:''};if(id==='posttest-lr'&&f.id==='independent')draft.likelihoodRatios='2, 3';const state=transition(d,{...s,draft},{type:'calculate'});assert.equal(state.snapshot,null,`${id} ${f.id} must not infer blank`);assert.ok(state.errors[f.id],`${id} ${f.id} actionable error`);}
});
