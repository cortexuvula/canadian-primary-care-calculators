import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ariscat} from '../src/batch-a-engine.js';
import {InputError} from '../src/engine.js';
import {raw,inputs} from './batch-a-support.js';
for(const spo2 of ['90.5','95.5','96.1'])test(`Doc adjudication: non-integer SpO₂ ${spo2} is blocked, not scored or rounded`,()=>assert.throws(()=>ariscat({...inputs('ariscat',raw.vectors.ariscat.valid[0].inputs),spo2}),e=>e instanceof InputError&&e.field==='spo2'&&/whole-number percentage/.test(e.message)));
