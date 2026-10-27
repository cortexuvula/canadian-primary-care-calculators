import {moduleTests} from './expansion-support.js';
moduleTests('fib4',[
 {inputs:{age:'50',ast:'30',alt:'40',platelets:'220'},expected:{fib4:1.078049202},band:'Low'},
 {inputs:{age:'60',ast:'80',alt:'90',platelets:'140'},expected:{fib4:3.614031612},band:'High'},
 {inputs:{age:'70',ast:'35',alt:'30',platelets:'200'},expected:{fib4:2.236533776},band:'Indeterminate'}
],[['age','17']]);
