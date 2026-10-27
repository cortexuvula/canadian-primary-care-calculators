import {moduleTests} from './expansion-support.js';
moduleTests('anion-gap',[
 {inputs:{sodium:'140',chloride:'105',bicarbonate:'24',potassium:'',albumin:'',convention:'exclude',reference:''},expected:{gap:11}},
 {inputs:{sodium:'138',chloride:'100',bicarbonate:'12',potassium:'4.5',albumin:'',convention:'include',reference:''},expected:{gap:30.5}},
 {inputs:{sodium:'140',chloride:'110',bicarbonate:'22',potassium:'',albumin:'25',convention:'exclude',reference:'44'},expected:{gap:8,corrected:12.75}},
 {inputs:{sodium:'140',chloride:'110',bicarbonate:'22',potassium:'',albumin:'25',convention:'exclude',reference:'40'},expected:{gap:8,corrected:11.75}}
]);
