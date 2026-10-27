import { test } from 'node:test';
import assert from 'node:assert/strict';
import { framingham, riskBand, cholesterolMgDl } from '../src/engine.js';
test('Canadian layer doubles only non-diabetic age 30–59 with premature first-degree history', () => {
 const r=framingham(a);
 assert.equal(framingham({...a,family:'yes'}).modifiedRisk,r.risk*2);
 assert.equal(framingham({...a,age:'59',family:'yes'}).modifierApplied,true);
 for(const v of [{...a,age:'60',family:'yes'},{...a,diabetes:'yes',family:'yes'},a]) {
  const result=framingham(v);assert.equal(result.modifiedRisk,result.risk);assert.equal(result.modifierApplied,false);
 }
 assert.ok(framingham({...a,smoker:'yes'}).risk > r.risk);
 assert.ok(framingham({...a,diabetes:'yes'}).risk > r.risk);
 assert.ok(framingham({...a,treated:'yes'}).risk > r.risk);
});
test('Canadian classification precedes presentation rounding', () => {
 for(const [n,band] of [[9.999,'Low'],[10,'Intermediate'],[19.999,'Intermediate'],[20,'High']]) assert.equal(riskBand(n),band);
 assert.equal(cholesterolMgDl(1),38.67);
});
const a = {sex:'male',age:'55',tc:'5.5',hdl:'1.1',sbp:'135',treated:'no',smoker:'no',diabetes:'no',cvd:'no',genetic:'no',bypass:'no',family:'no'};

// Independent coefficient source: D’Agostino 2008 / FHS official coefficients (see THIRD-PARTY-NOTICES.md).
// Recalculation: scripts/recompute-guard-pins.py; no production imports.
// W1c: published male diabetes coefficient .57367; all other inputs unchanged.
test('W1c Framingham male diabetes coefficient yields 24.4%', () => {
 assert.ok(Math.abs(framingham({...a,diabetes:'yes'}).risk-24.36)<.1);
});
test('Framingham independently derived male vector A = 14.6%', () => {
 assert.equal(framingham(a).risk.toFixed(1),'14.6');
});
test('Framingham female vectors cross-check FHS and treated smoking branch', () => {
 assert.equal(framingham({...a,sex:'female',age:'30',tc:'4.65',hdl:'1.16',sbp:'125'}).risk.toFixed(1),'1.3');
 assert.equal(framingham({...a,sex:'female',tc:'6',hdl:'1',sbp:'145',treated:'yes',smoker:'yes'}).risk.toFixed(1),'24.7');
});
for (const key of Object.keys(a)) {
 for (const bad of ['', ' ', null, undefined, NaN, Infinity, true, {}, '5foo', '0x10']) {
  test(`Framingham rejects malformed/missing ${key}: ${String(bad)}`, () => assert.throws(() => framingham({...a,[key]:bad})));
 }
}
for (const [key,values] of Object.entries({age:['29','75','55.5'],sbp:['89','201','0','-1'],tc:['2','11','0'],hdl:['0.2','3','0']})) {
 for (const value of values) test(`Framingham blocks unsupported ${key} ${value}`, () => assert.throws(() => framingham({...a,[key]:value})));
}
for (const key of ['cvd','genetic','bypass']) test(`Framingham blocks ${key}`, () => assert.throws(() => framingham({...a,[key]:'yes'})));
test('Framingham rejects HDL >= total cholesterol', () => assert.throws(() => framingham({...a,tc:'2.6',hdl:'2.6'})));
test('Framingham accepts exact FHS spreadsheet boundaries', () => {
 for(const [key,values] of Object.entries({age:[30,74],sbp:[90,200],tc:[100/38.67,405/38.67],hdl:[10/38.67,100/38.67]}))
  for(const value of values) assert.ok(Number.isFinite(framingham({...a,[key]:String(value)}).risk));
});
