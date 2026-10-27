import {InputError} from './engine.js';
export function initial(d,revision=0) {
  return {id:d.id,revision,draft:Object.fromEntries(d.inputs.map(f=>[f.id,''])),snapshot:null,errors:{},status:''};
}
export function currentSnapshot(d,s) {
  const r=s?.snapshot;
  return r && s.id===d.id && r.id===d.id && r.version===d.version && r.revision===s.revision ? r : null;
}
export function transition(d,s,action) {
  if(s.id!==d.id) throw new Error('Calculator state mismatch');
  if(action.type==='reset') return initial(d,s.revision+1);
  if(action.type==='edit') return {...s,revision:s.revision+1,draft:{...s.draft,[action.field]:action.value},snapshot:null,errors:{},status:s.snapshot||s.status?'Inputs changed — calculate again':''};
  if(action.type==='calculate') {
    try {
      const result=Object.freeze(d.calculate(s.draft));
      const inputs=Object.freeze(Object.fromEntries(d.inputs.map(f=>[f.id,f.type==='number'?(s.draft[f.id]===''&&f.optional?null:Number(s.draft[f.id])):s.draft[f.id]])));
      const snapshot=Object.freeze({id:d.id,version:d.version,revision:s.revision,inputs,result});
      return {...s,snapshot,errors:{},status:'Result ready'};
    } catch(error) {
      return {...s,snapshot:null,errors:error instanceof InputError?{[error.field]:error.message}:{},status:error instanceof InputError?'Check the highlighted fields':'Unable to calculate this result; inputs were not saved'};
    }
  }
  return s;
}
