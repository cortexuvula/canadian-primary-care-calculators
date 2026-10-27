import {moduleTests} from './expansion-support.js';
const eligible={fasting:'yes',exogenous:'no',population:'yes'};
moduleTests('homa1-b',[
 {inputs:{glucose:'5.8',insulin:'114',...eligible},expected:{beta:165.217391}},
 {inputs:{glucose:'5',insulin:'60',...eligible},expected:{beta:133.333333}}
],[['glucose','3.5'],['fasting','no'],['exogenous','yes'],['population','no']],1e-6);
