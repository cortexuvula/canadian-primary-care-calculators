import {moduleTests} from './expansion-support.js';
moduleTests('qtc',[
 {inputs:{qt:'400',hr:'60',formula:'bazett'},expected:{qtc:400,rr:1}},
 {inputs:{qt:'360',hr:'100',formula:'bazett'},expected:{qtc:464.758002}},
 {inputs:{qt:'360',hr:'100',formula:'fridericia'},expected:{qtc:426.827197}},
 {inputs:{qt:'360',hr:'100',formula:'framingham'},expected:{qtc:421.6}},
 {inputs:{qt:'360',hr:'100',formula:'hodges'},expected:{qtc:430}}
],[],1e-6); // Initial Doc prose precision; independent machine-precision JSON added separately.
