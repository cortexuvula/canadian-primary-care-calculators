// Presentation only: never mutates catalog definitions or clinical state.
export const BATCH_SIZE=24;
export function filterCatalog(catalog,{query='',category='all',onlyFavourites=false,favouriteIds=[],letter='all',az=false}={}) {
 const q=query.trim().toLowerCase();
 const rows=catalog.filter(d=>(category==='all'||d.category===category)&&(!onlyFavourites||favouriteIds.includes(d.id))&&(letter==='all'||d.name.toUpperCase().startsWith(letter))&&(!q||[d.name,d.category,...d.aliases].some(s=>s.toLowerCase().includes(q))));
 return az?rows.sort((a,b)=>a.name.localeCompare(b.name,'en')):rows;
}
export function catalogPage(catalog,filters,limit=BATCH_SIZE) {
 const matches=filterCatalog(catalog,filters);
 return {matches,shown:matches.slice(0,limit)};
}
