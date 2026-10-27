import {build} from 'esbuild';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
await mkdir('.browser',{recursive:true});
await build({entryPoints:['e2e/runtime.js'],outfile:'.browser/runtime.js',bundle:true,format:'esm',define:{'process.env.NODE_ENV':'"development"'}});
const root=process.cwd();
if (process.env.CPC_SDK_FIXTURE) {
 const source=resolve('.browser/sdk/apps/desktop/src');
 await build({stdin:{contents:`export {Button} from ${JSON.stringify(source+'/components/ui/button.tsx')}; export {Input} from ${JSON.stringify(source+'/components/ui/input.tsx')};`,resolveDir:root,loader:'tsx'},outfile:'.browser/native-ui.js',bundle:true,format:'esm',alias:{'@':source},external:['react','react/jsx-runtime'],jsx:'automatic',define:{'process.env.NODE_ENV':'"development"'}});
}
await build({entryPoints:['e2e/scale-entry.jsx'],outfile:'.browser/scale.js',bundle:true,format:'esm',external:['react','react/jsx-runtime','@hermes/plugin-sdk'],jsx:'automatic'});
const html=(await readFile('e2e/index.html','utf8')).replace('plugin.register(ctx);',`${process.env.CPC_SDK_FIXTURE?"window.nativeControls=await import('/.browser/native-ui.js');":''}plugin.register(ctx);`);
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/'){res.setHeader('Content-Type','text/html');return res.end(html);}const path=url.pathname==='/plugin.js'&&process.env.CPC_PLUGIN_FILE?resolve(root,process.env.CPC_PLUGIN_FILE):resolve(root,'.'+decodeURIComponent(url.pathname));if(!path.startsWith(root+'/'))throw Error();res.setHeader('Content-Type',extname(path)==='.js'?'text/javascript':'text/plain');res.end(await readFile(path));}catch{res.writeHead(404);res.end();}});
server.listen(43187,'127.0.0.1');
