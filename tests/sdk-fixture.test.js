import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
const script=resolve('scripts/verify-sdk.js');
const sha='818c13be1dc4fd28987e1e881a9408224afd4535';
function fixture(t){
 mkdirSync('.artifacts',{recursive:true});
 const root=mkdtempSync(resolve('.artifacts/sdk-test-'));
 t.after(()=>rmSync(root,{recursive:true,force:true}));
 mkdirSync(join(root,'e2e'));
 const bytes=Buffer.from('synthetic SDK test file\n');
 const hash=createHash('sha256').update(bytes).digest('hex');
 const manifest={sha,files:{'LICENSE':hash}};
 writeFileSync(join(root,'e2e/sdk-fixture.json'),JSON.stringify(manifest));
 // Any attempted acquisition or filesystem write is a hard failure in the child.
 writeFileSync(join(root,'offline.mjs'),`import * as fs from 'node:fs/promises';
 globalThis.fetch=()=>{throw Error('network forbidden');};
 for(const name of ['writeFile','mkdir','rename','copyFile'])fs.default[name]=()=>{throw Error('write forbidden');};
 import {syncBuiltinESMExports} from 'node:module';syncBuiltinESMExports();`);
 return {root,bytes,manifest,run:()=>spawnSync(process.execPath,['--import',join(root,'offline.mjs'),script],{cwd:root,encoding:'utf8'})};
}
test('SDK verifier accepts valid preprovisioned bytes offline without writes',t=>{
 const f=fixture(t);mkdirSync(join(f.root,'.browser/sdk'),{recursive:true});
 const target=join(f.root,'.browser/sdk/LICENSE');writeFileSync(target,f.bytes);
 const result=f.run();assert.equal(result.status,0,result.stderr);
 assert.match(result.stdout,/Verified SDK LICENSE/);assert.deepEqual(readFileSync(target),f.bytes);
});
test('SDK verifier rejects missing fixture without fetching or creating it',t=>{
 const f=fixture(t);const result=f.run();assert.notEqual(result.status,0);
 assert.match(result.stderr,/SDK fixture missing: LICENSE/);assert.match(result.stderr,/docs\/sdk-fixture.md/);
 assert.equal(existsSync(join(f.root,'.browser')),false);
});
test('SDK verifier rejects corrupt bytes without repairing them',t=>{
 const f=fixture(t);mkdirSync(join(f.root,'.browser/sdk'),{recursive:true});
 const target=join(f.root,'.browser/sdk/LICENSE');writeFileSync(target,'corrupt');
 const result=f.run();assert.notEqual(result.status,0);assert.match(result.stderr,/SDK checksum mismatch: LICENSE/);
 assert.equal(readFileSync(target,'utf8'),'corrupt');
});
test('SDK verifier rejects a non-immutable commit pin',t=>{
 const f=fixture(t);f.manifest.sha='main';writeFileSync(join(f.root,'e2e/sdk-fixture.json'),JSON.stringify(f.manifest));
 const result=f.run();assert.notEqual(result.status,0);assert.match(result.stderr,/SDK manifest requires a full commit SHA/);
});
test('SDK verifier rejects unsafe fixture paths and invalid checksums',t=>{
 const f=fixture(t);
 for(const files of [{'../escape':'0'.repeat(64)},{LICENSE:'bad'}]){
  f.manifest.files=files;writeFileSync(join(f.root,'e2e/sdk-fixture.json'),JSON.stringify(f.manifest));
  const result=f.run();assert.notEqual(result.status,0);assert.match(result.stderr,/Invalid SDK fixture entry/);
 }
});
