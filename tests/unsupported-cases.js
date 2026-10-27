// Synthetic invalid/unsupported scenarios; shared UI/engine contracts, not numeric oracles.
export const unsupported = {
 'bmi':[{field:'age',value:'17'},{field:'age',value:'121'}],
 'bsa-mosteller':[],
 'fib4':[{field:'age',value:'17'},{field:'alt',value:'0'}],
 'apri':[{field:'acute',value:'yes'},{field:'uln',value:'0'}],
 'anion-gap':[{field:'convention',value:'include',errorField:'potassium'},{field:'albumin',value:'25',errorField:'reference'}],
 'corrected-sodium':[{field:'glucose',value:'0'}],
 'qtc':[{field:'hr',value:'0'}],
 'homa1-b':[{field:'glucose',value:'3.5'},{field:'fasting',value:'no'},{field:'exogenous',value:'yes'},{field:'population',value:'no'}],
 'quicki':[{field:'fasting',value:'no'},{field:'exogenous',value:'yes'},{field:'population',value:'no'},{field:'glucose',value:'0.01',also:{insulin:'0.01'}}],
 'cha2ds2-vasc':[{field:'af',value:'no'}],
 'has-bled':[{field:'af',value:'no'},{field:'age',value:'17'},{field:'anticoagulant',value:'non-vka',errorField:'labile'},{field:'labile',value:'na'}],
 'cockcroft-gault':[{field:'age',value:'93'},{field:'age',value:'17'}]
};
