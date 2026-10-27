import {moduleTests} from './expansion-support.js';
moduleTests('cockcroft-gault',[
 {inputs:{age:'40',weight:'70',creatinine:'90',sex:'male'},expected:{crcl:95.49382716049382}},
 {inputs:{age:'40',weight:'60',creatinine:'80',sex:'female'},expected:{crcl:78.27083333333333}}
],[['age','17'],['age','93']],1e-9);
