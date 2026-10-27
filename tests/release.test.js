import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdirSync,mkdtempSync,readFileSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const script=resolve('scripts/release.py');
test('release ZIP is deterministic, commit-bound and excludes unapproved files',()=>{
 assert.ok(existsSync(script),'release script must exist');
 mkdirSync('.browser',{recursive:true});const dir=mkdtempSync(resolve('.browser/release-test-'));
 const repo=dir+'/source',out=dir+'/assets';mkdirSync(repo);mkdirSync(repo+'/desktop');
 const run=(args)=>spawnSync(args[0],args.slice(1),{cwd:repo,encoding:'utf8'});
 const git=(...args)=>{const r=run(['git',...args]);assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
 try{
 const bytes='// synthetic release-fixture runtime\n';
 const hash=createHash('sha256').update(bytes).digest('hex');
 for(const f of ['plugin.js','desktop/plugin.js'])writeFileSync(repo+'/'+f,bytes);
 writeFileSync(repo+'/runtime.sha256',hash+'\n');writeFileSync(repo+'/package.json','{"version":"0.4.0"}');
 writeFileSync(repo+'/plugin.yaml','name: canadian-primary-care\nversion: "0.4.0"\n');
 const files=['desktop/plugin.js','package.json','plugin.js','plugin.yaml','public-files.json','runtime.sha256'];
 writeFileSync(repo+'/public-files.json',JSON.stringify(files));
 git('init','-b','main');git('add','.');git('-c','user.name=Release Test','-c','user.email=test@example.invalid','commit','-m','Synthetic fixture');
 const sha=git('rev-parse','HEAD');
 writeFileSync(repo+'/private-untracked.txt','must not be archived');
 let r=run(['python3',script,out]);assert.equal(r.status,0,r.stderr+r.stdout);
 const zip=out+'/canadian-primary-care-0.4.0.zip',first=readFileSync(zip);
 r=run(['python3',script,out]);assert.equal(r.status,0,r.stderr);assert.deepEqual(readFileSync(zip),first);
 const manifest=JSON.parse(readFileSync(out+'/ASSET-MANIFEST.json'));assert.equal(manifest.source_sha,sha);assert.equal(manifest.runtime_sha256,hash);
 const inspect=run(['python3','-c',`import zipfile,json; z=zipfile.ZipFile(${JSON.stringify(zip)}); print(json.dumps(z.namelist()))`]);
 const members=JSON.parse(inspect.stdout);assert.equal(members.includes('canadian-primary-care/private-untracked.txt'),false);assert.equal(members.length,files.length+1);
 r=run(['python3',script,repo+'/bad-output']);assert.notEqual(r.status,0);assert.match(r.stderr,/outside/);
 writeFileSync(repo+'/plugin.js','changed');r=run(['python3',script,out]);assert.notEqual(r.status,0);assert.match(r.stderr,/clean/);
 writeFileSync(repo+'/plugin.js',bytes);git('add','private-untracked.txt');git('-c','user.name=Release Test','-c','user.email=test@example.invalid','commit','-m','Unapproved fixture file');
 r=run(['python3',script,out]);assert.notEqual(r.status,0);assert.match(r.stderr,/allowlist/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
