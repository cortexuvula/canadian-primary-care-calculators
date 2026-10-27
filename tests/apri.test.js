import {moduleTests} from './expansion-support.js';
moduleTests('apri',[
 {inputs:{ast:'30',uln:'40',platelets:'220',acute:'no'},expected:{apri:.340909091}},
 {inputs:{ast:'110',uln:'40',platelets:'110',acute:'no'},expected:{apri:2.5}},
 {inputs:{ast:'132',uln:'40',platelets:'220',acute:'no'},expected:{apri:1.5}}
],[['acute','yes']]);
