import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {registry} from '../src/registry.js';
const hash=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
test('public package keeps protected numerical source bytes and both reviewed runtimes',()=>{
 assert.ok(existsSync('clinical.sha256.json'),'protected-source digest manifest must exist');
 const pins=JSON.parse(readFileSync('clinical.sha256.json'));
 assert.deepEqual(Object.keys(pins).sort(),['src/batch-a-engine.js','src/batch-a-groups.js','src/batch-a-registry.js','src/batch-a-vectors.js','src/engine.js','src/expansion-registry.js','src/expansion-vectors.js','src/registry.js','src/state.js']);
 for(const [file,expected]of Object.entries(pins))assert.equal(hash(file),expected,file);
 const expected=readFileSync('runtime.sha256','utf8').trim();
 assert.equal(hash('plugin.js'),expected);assert.equal(hash('desktop/plugin.js'),expected);
 assert.equal(registry.length,26);assert.equal(new Set(registry.map(d=>d.category)).size,15);
});
test('Batch A preserves original fifteen clinical definitions and snapshot semantics byte-for-byte',()=>{
 const protectedBaseline={
  'src/engine.js':'83a58839f1ee0ec6866c7ae68e86a71788b01d36aa1aa43a1f662e424daf2c03',
  'src/expansion-registry.js':'29d2f709771355537ab027951a60d61c46b96984e22c956fd16940921244f5d5',
  'src/expansion-vectors.js':'8f86891cb1aa8e6268e4a6acd910d0b5a6695f4382fd1dd732a79fe71ca4f02a',
  'src/state.js':'1b571bae46c15f5635e67ace81e420b9da1dbfc51cd2e014534d928ea984d16e'
 };
 for(const [file,pin]of Object.entries(protectedBaseline))assert.equal(hash(file),pin,file);
 const original=readFileSync('src/registry.js','utf8').replace("import {batchA} from './batch-a-registry.js';\n",'').replace(' ...expansion,\n ...batchA\n',' ...expansion\n').replace('...(d.resultOutputs?d.resultOutputs(result):d.outputs).filter','...d.outputs.filter');
 assert.equal(createHash('sha256').update(original).digest('hex'),'4ecdf36de8713f821038633d4971faa7ea9995f5d51bc0505fdbfd74ad5e54f4');
});
test('public metadata and clinical copy stay honest and consistent',()=>{
 const pkg=JSON.parse(readFileSync('package.json'));
 const lock=JSON.parse(readFileSync('package-lock.json'));
 const manifest=readFileSync('plugin.yaml','utf8');
 assert.equal(pkg.version,'0.4.0');assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version);
 assert.equal(pkg.license,'MIT');assert.match(readFileSync('LICENSE','utf8'),/Copyright \(c\) 2026 Andre Hugo/);
 assert.match(manifest,/version: "0\.4\.0"/);assert.match(manifest,/requires_hermes: ">=0\.21\.6"/);
 assert.equal(existsSync('__init__.py'),false,'no fake Python backend');
 for(const file of ['README.md','docs/clinical-guide.md']){
  const text=readFileSync(file,'utf8');assert.match(text,/no regulatory classification is asserted/i);
  assert.doesNotMatch(text,/it is not a medical device|all inputs are synthetic\/examples/i);
 }
});
