// FICTIONAL navigation-only fixtures. Never imported by production entry points.
export function fictionalCatalog(size) {
 return Array.from({length:size},(_,i)=>({id:`fictional-${i}`,name:`${String.fromCharCode(65+i%26)} Fictional navigation fixture ${String(i).padStart(3,'0')}`,category:`Fictional category ${i%3}`,aliases:[`fictional-alias-${i}-exact`],version:'FICTIONAL — no clinical model'}));
}
