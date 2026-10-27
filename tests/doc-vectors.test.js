import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registry} from '../src/registry.js';
import {InputError} from '../src/engine.js';
const data=JSON.parse(readFileSync(new URL('./fixtures/doc-v2-normalized.json',import.meta.url)));
for(const v of data.valid)test(`Doc full precision ${v.calculator} ${v.id}`,()=>{const d=registry.find(d=>d.id===v.calculator),r=d.calculate(v.inputs);for(const [key,n]of Object.entries(v.expected)){if(key==='score')assert.equal(r[key],n);else assert.ok(Math.abs(r[key]-n)<=1e-9,`${r[key]} != ${n}`);assert.equal(r[key].toFixed(d.outputs.find(o=>o.key===key).decimals),v.display[key]);}if(v.calculator==='bmi'&&v.inputs.pregnantOrLactating==='yes')assert.equal(r.band,null);});
for(const v of data.guards)test(`Doc guard ${v.calculator} ${v.id}`,()=>assert.throws(()=>registry.find(d=>d.id===v.calculator).calculate(v.inputs),InputError));
test('twelve independently vector-tested additions, no silent oracle exclusions',()=>{assert.equal(new Set(data.valid.map(v=>v.calculator)).size,12);assert.deepEqual(data.quarantined.map(v=>v.id),['V6']);});
