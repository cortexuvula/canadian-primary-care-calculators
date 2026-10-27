// Offline test-fixture verification only. Never acquires or repairs files.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const manifest=JSON.parse(await readFile('e2e/sdk-fixture.json','utf8'));
if(typeof manifest.sha!=='string'||!/^[0-9a-f]{40}$/.test(manifest.sha))throw Error('SDK manifest requires a full commit SHA');
if(!manifest.files||typeof manifest.files!=='object'||Array.isArray(manifest.files)||!Object.keys(manifest.files).length)throw Error('SDK manifest requires file checksums');
for(const [path,hash] of Object.entries(manifest.files)){
 if(!/^[A-Za-z0-9._/-]+$/.test(path)||path.split('/').some(p=>!p||p==='.'||p==='..')||typeof hash!=='string'||!/^[0-9a-f]{64}$/.test(hash))throw Error('Invalid SDK fixture entry: '+path);
 let bytes;
 try{bytes=await readFile('.browser/sdk/'+path);}catch{throw Error('SDK fixture missing: '+path+'; provision explicitly using docs/sdk-fixture.md');}
 if(createHash('sha256').update(bytes).digest('hex')!==hash)throw Error('SDK checksum mismatch: '+path+'; re-provision explicitly using docs/sdk-fixture.md');
 console.log('Verified SDK '+path+' '+hash);
}
