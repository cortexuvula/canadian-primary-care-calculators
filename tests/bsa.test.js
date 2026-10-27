import {moduleTests} from './expansion-support.js';
moduleTests('bsa-mosteller',[
 {inputs:{weight:'70',height:'170'},expected:{bsa:1.818118686}},
 {inputs:{weight:'80',height:'180'},expected:{bsa:2}},
 {inputs:{weight:'50',height:'160'},expected:{bsa:1.490711985}}
]);
