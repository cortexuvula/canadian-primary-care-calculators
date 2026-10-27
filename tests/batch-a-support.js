import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {InputError} from '../src/engine.js';
export const raw=JSON.parse(readFileSync(new URL('./fixtures/doc-batch-a-vectors.json',import.meta.url)));
export function inputs(id,v){return {...Object.fromEntries(Object.entries(v).map(([k,n])=>[k,Array.isArray(n)?n.join(', '):String(n)])),...(['urine-acr','urine-pcr'].includes(id)?{outputUnit:'mg/mmol'}:{}),...(id==='posttest-lr'?{independent:'yes'}:{})};}
export function verify(id,fn){
 for(const v of raw.vectors[id].valid)test(`Batch A independent ${id} ${v.id}: ${v.label}`,async()=>{
  const engine=await import('../src/batch-a-engine.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
  assert.equal(typeof engine[fn],'function','authorized calculator must be implemented');
  let r;assert.doesNotThrow(()=>{r=engine[fn](inputs(id,v.inputs));},'valid independent vector must be accepted');
  for(const [k,n]of Object.entries(v.outputs))if(k==='score')assert.equal(r[k],n);else if(typeof n==='number')assert.ok(Math.abs(r[k]-n)<=Math.max(1e-9,Math.abs(n)*1e-12),`${id} ${k}: ${r[k]} != ${n}`);else assert.equal(r[k],n);
 });
 for(const v of raw.vectors[id].guards)test(`Batch A guard ${id} ${v.id}: ${v.reason}`,async()=>{
  const engine=await import('../src/batch-a-engine.js').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
  assert.equal(typeof engine[fn],'function','authorized calculator must be implemented');
  assert.throws(()=>engine[fn](inputs(id,v.inputs)),InputError);
 });
}
