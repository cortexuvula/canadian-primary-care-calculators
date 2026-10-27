import {moduleTests} from './expansion-support.js';
const eligible={fasting:'yes',exogenous:'no',population:'yes'};
moduleTests('quicki',[
 {inputs:{glucose:'5.8',insulin:'114',...eligible},expected:{quicki:.303228783}},
 {inputs:{glucose:'5',insulin:'60',...eligible},expected:{quicki:.338452039}},
 {inputs:{glucose:'6.5',insulin:'90',...eligible},expected:{quicki:.308198418}}
],[['fasting','no'],['exogenous','yes'],['population','no']]);
