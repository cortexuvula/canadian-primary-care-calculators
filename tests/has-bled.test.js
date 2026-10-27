import {moduleTests} from './expansion-support.js';
const base={af:'yes',age:'50',hypertension:'yes',renal:'no',liver:'no',stroke:'no',bleeding:'no',anticoagulant:'vka',labile:'no',drugs:'no',alcohol:'no'};
moduleTests('has-bled',[
 {inputs:base,expected:{score:1}},
 {inputs:{...base,age:'66',renal:'yes',liver:'yes',stroke:'yes',bleeding:'yes',labile:'yes',drugs:'yes',alcohol:'yes'},expected:{score:9}},
 {inputs:{...base,hypertension:'no',renal:'yes',liver:'yes',drugs:'yes',alcohol:'yes'},expected:{score:4}},
 {inputs:{...base,hypertension:'no',age:'65',anticoagulant:'non-vka',labile:'na'},expected:{score:0}}
],[['af','no'],['anticoagulant','non-vka','labile'],['labile','na']]);
