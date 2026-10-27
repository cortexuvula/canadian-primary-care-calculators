import {moduleTests} from './expansion-support.js';
const base={af:'yes',ageBand:'65-74',sex:'female',chf:'yes',hypertension:'no',diabetes:'no',stroke:'no',vascular:'no'};
moduleTests('cha2ds2-vasc',[
 {inputs:base,expected:{score:3}},
 {inputs:{...base,ageBand:'75plus',sex:'male',chf:'no',hypertension:'yes',diabetes:'yes'},expected:{score:4}},
 {inputs:{...base,ageBand:'under65',chf:'no'},expected:{score:1}},
 {inputs:{...base,ageBand:'75plus',hypertension:'yes',diabetes:'yes',stroke:'yes',vascular:'yes'},expected:{score:9}}
],[['af','no']]);
