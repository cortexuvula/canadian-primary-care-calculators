import {test} from 'node:test';
import assert from 'node:assert/strict';
import {homa} from '../src/engine.js';
const a={glucose:'5.8',insulin:'114',fasting:'yes',exogenous:'no',population:'yes'};
test('HOMA1 V2 independent reference = 2.22',()=>assert.equal(homa({...a,glucose:'5',insulin:'60'}).ir.toFixed(2),'2.22'));
test('HOMA1 blocks non-fasting, exogenous insulin and unsupported population',()=>{
 for(const v of [{...a,fasting:'no'},{...a,exogenous:'yes'},{...a,population:'no'}]) assert.throws(()=>homa(v));
});
for(const key of Object.keys(a)) test(`HOMA1 ${key} requires a deliberate valid value`,()=>{
 for(const bad of ['', ' ',null,undefined,NaN,Infinity,true,{},'NaN','Infinity','0x10','5x']) assert.throws(()=>homa({...a,[key]:bad}));
});
test('HOMA1 numeric sanity rejects zero, negative, overflow and underflow',()=>{
 for(const key of ['glucose','insulin']) for(const bad of ['0','-1','9'.repeat(310),'0.'+'0'.repeat(325)+'1']) assert.throws(()=>homa({...a,[key]:bad}));
 assert.throws(()=>homa({...a,glucose:'1'+'0'.repeat(200),insulin:'1'+'0'.repeat(200)}));
});
test('HOMA1-IR Canadian reference V1 = 4.90, insulin = 19.0 mU/L', () => {
 const r=homa(a);assert.equal(r.ir.toFixed(2),'4.90');assert.equal(r.insulinMu,19);
});
