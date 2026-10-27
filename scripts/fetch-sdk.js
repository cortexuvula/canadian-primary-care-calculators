// Test-only public SDK controls. No plugin installation or host modifications.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const manifest=JSON.parse(await readFile('e2e/sdk-fixture.json','utf8'));
for(const [path,hash] of Object.entries(manifest.files)){
 const target='.browser/sdk/'+path;
 let bytes;try{bytes=await readFile(target);}catch{}
 if(!bytes||createHash('sha256').update(bytes).digest('hex')!==hash){
  const response=await fetch(`https://raw.githubusercontent.com/NousResearch/hermes-agent/${manifest.sha}/${path}`);
  if(!response.ok)throw Error(`SDK download ${response.status}: ${path}`);
  bytes=Buffer.from(await response.arrayBuffer());
  if(createHash('sha256').update(bytes).digest('hex')!==hash)throw Error('SDK checksum mismatch: '+path);
  await mkdir(target.slice(0,target.lastIndexOf('/')),{recursive:true});await writeFile(target,bytes);
 }
 console.log('Verified SDK '+path+' '+hash);
}
