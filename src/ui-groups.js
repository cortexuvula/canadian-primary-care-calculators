// Presentation only. Ordered, exhaustive groups from the UI Consultant audit.
// Clinical definitions remain the authority for every field and its content.
export const inputGroups = {
  framingham: [['Model and age',['sex','age']],['Measurements',['tc','hdl','sbp']],['Risk factors',['treated','smoker','diabetes']],['Eligibility checks',['cvd','genetic','bypass']],['Canadian reporting input',['family']]],
  'homa1-ir': [['Measurements',['glucose','insulin']],['Eligibility',['fasting','exogenous','population']]],
  'egfr-2021': [['Model and measurements',['sex','age','creatinine']],['Applicability',['stable','habit']]],
  bmi: [['Measurements and age',['weight','height','age']],['Classification applicability',['pregnantOrLactating']]],
  'bsa-mosteller': [['Measurements',['height','weight']]],
  apri: [['Laboratory inputs',['ast','uln','platelets']],['Applicability',['acute']]],
  'anion-gap': [['Electrolytes',['sodium','chloride','bicarbonate']],['Potassium convention',['convention','potassium']],['Optional albumin correction',['albumin','reference']]],
  'corrected-sodium': [['Measurements',['sodium','glucose']],['Method selection',['formula']]],
  qtc: [['Measurements',['qt','hr']],['Method selection',['formula']]],
  'homa1-b': [['Measurements',['glucose','insulin']],['Eligibility',['fasting','exogenous','population']]],
  quicki: [['Measurements',['glucose','insulin']],['Eligibility',['fasting','exogenous','population']]],
  'cha2ds2-vasc': [['AF/model context',['af','ageBand','sex']],['Risk factors',['chf','hypertension','diabetes','stroke','vascular']]],
  'has-bled': [['AF and age',['af','age']],['Clinical factors',['hypertension','renal','liver','stroke','bleeding']],['Anticoagulant and INR',['anticoagulant','labile']],['Medicines and alcohol',['drugs','alcohol']]],
  fib4: [['Laboratory and age',['age','ast','alt','platelets']]],
  'cockcroft-gault': [['Model and age',['age','sex']],['Measurements',['weight','creatinine']]],
};
