import {moduleTests} from './expansion-support.js';
moduleTests('bmi',[
 {inputs:{weight:'70',height:'175',age:'40',pregnantOrLactating:'no'},expected:{bmi:22.857142857}},
 {inputs:{weight:'95',height:'170',age:'40',pregnantOrLactating:'no'},expected:{bmi:32.871972318}},
 {inputs:{weight:'81',height:'180',age:'40',pregnantOrLactating:'no'},expected:{bmi:25},band:'Overweight'}
],[['age','17']]);
