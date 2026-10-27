import {registry} from '../src/registry.js';
console.log(JSON.stringify({count:registry.length,categories:[...new Set(registry.map(d=>d.category))],calculators:registry.map(d=>({id:d.id,...(d.requestId?{requestId:d.requestId}:{}),name:d.name,version:d.version,referenceVectors:d.vectors.length,clinicalReview:d.clinicalReview}))},null,2));
