import {moduleTests} from './expansion-support.js';
moduleTests('corrected-sodium',[
 {inputs:{sodium:'128',glucose:'30',formula:'katz'},expected:{sodium:135.047680}},
 {inputs:{sodium:'128',glucose:'30',formula:'hillier'},expected:{sodium:138.571520}},
 {inputs:{sodium:'135',glucose:'8',formula:'katz'},expected:{sodium:135.706048}},
 {inputs:{sodium:'135',glucose:'8',formula:'hillier'},expected:{sodium:136.059072}}
],[]);
