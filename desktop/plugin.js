// src/plugin.jsx
import { useState, useRef, useLayoutEffect } from "react";
import { Button, Input, host, ROUTES_AREA, SIDEBAR_NAV_AREA, PALETTE_AREA } from "@hermes/plugin-sdk";

// src/engine.js
var cholesterolMgDl = (value) => value * 38.67;
var InputError = class extends Error {
  constructor(field, message) {
    super(message);
    this.name = "InputError";
    this.field = field;
  }
};
function fail(field, message) {
  throw new InputError(field, message);
}
function numeric(value, field) {
  if (!["string", "number"].includes(typeof value) || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(String(value).trim())) fail(field, "Enter a finite positive decimal number in the labelled unit.");
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) fail(field, "Enter a finite number greater than zero (numeric sanity guard).");
  return n;
}
function choice(value, field, options = ["yes", "no"]) {
  if (!options.includes(value)) fail(field, "Select an explicit answer; blank is not No.");
  return value;
}
function range(n, field, min, max, message) {
  if (n < min || n > max) fail(field, message);
}
function age(value, minimum, maximum) {
  const n = numeric(value, "age");
  if (!Number.isInteger(n)) fail("age", "Enter age in completed whole years.");
  range(n, "age", minimum, maximum, `Unsupported age: this calculator supports ${minimum}–${maximum} completed years. See model and sanity limits.`);
  return n;
}
function framingham(v) {
  choice(v.sex, "sex", ["male", "female"]);
  const years = age(v.age, 30, 74);
  const tc = numeric(v.tc, "tc"), hdl = numeric(v.hdl, "hdl"), sbp = numeric(v.sbp, "sbp");
  range(sbp, "sbp", 90, 200, "Unsupported: FHS public calculator bounds are SBP 90–200 mmHg; no clamping.");
  range(tc, "tc", 100 / 38.67, 405 / 38.67, "Unsupported: FHS total cholesterol bounds 100–405 mg/dL (100/38.67–405/38.67 mmol/L; approximately 2.586–10.473).");
  range(hdl, "hdl", 10 / 38.67, 100 / 38.67, "Unsupported: FHS HDL bounds 10–100 mg/dL (10/38.67–100/38.67 mmol/L; approximately 0.259–2.586).");
  if (hdl >= tc) fail("hdl", "Total cholesterol must exceed HDL (FHS calculator guard).");
  for (const key of ["treated", "smoker", "diabetes", "cvd", "genetic", "bypass", "family"]) choice(v[key], key);
  for (const key of ["cvd", "genetic", "bypass"]) if (v[key] !== "no") fail(key, "Unsupported primary-prevention population. No risk estimate produced; see applicability.");
  const male = v.sex === "male";
  const b = male ? [3.06117, 1.1237, -0.93263, v.treated === "yes" ? 1.99881 : 1.93303, 0.65451, 0.57367] : [2.32888, 1.20904, -0.70833, v.treated === "yes" ? 2.82263 : 2.76157, 0.52873, 0.69154];
  const sum = b[0] * Math.log(Number(v.age)) + b[1] * Math.log(cholesterolMgDl(Number(v.tc))) + b[2] * Math.log(cholesterolMgDl(Number(v.hdl))) + b[3] * Math.log(Number(v.sbp)) + b[4] * Number(v.smoker === "yes") + b[5] * Number(v.diabetes === "yes");
  const risk = 100 * (1 - (male ? 0.88936 : 0.95012) ** Math.exp(sum - (male ? 23.9802 : 26.1931)));
  const modifierApplied = years < 60 && v.diabetes === "no" && v.family === "yes";
  const modifiedRisk = risk * (modifierApplied ? 2 : 1);
  if (modifiedRisk > 100) fail("family", "Unsupported: Canadian doubling exceeds 100%; no interpretable probability produced.");
  return { risk, modifiedRisk, modifierApplied, band: riskBand(modifiedRisk) };
}
function homa(v) {
  const glucose = numeric(v.glucose, "glucose"), insulin = numeric(v.insulin, "insulin");
  for (const key of ["fasting", "exogenous", "population"]) choice(v[key], key);
  if (v.fasting !== "yes") fail("fasting", "Unsupported: confirm an overnight fast of at least 8 hours, water only.");
  if (v.exogenous !== "no") fail("exogenous", "Unsupported: requires endogenous insulin; exogenous insulin invalidates HOMA1.");
  if (v.population !== "yes") fail("population", "Unsupported: use only for non-diabetic or early untreated dysglycaemia; established beta-cell failure and treatment distort the estimate.");
  const insulinMu = insulin / 6;
  const ir = glucose * insulinMu / 22.5;
  if (!Number.isFinite(ir) || ir <= 0 || insulinMu <= 0) fail("insulin", "Numeric overflow/underflow: no interpretable result produced.");
  return { ir, insulinMu };
}
function egfr(v) {
  choice(v.sex, "sex", ["male", "female"]);
  const years = age(v.age, 18, 120);
  const creatinine = numeric(v.creatinine, "creatinine");
  choice(v.stable, "stable");
  choice(v.habit, "habit");
  if (v.stable !== "yes") fail("stable", "Unsupported: acute kidney injury or unstable creatinine.");
  if (v.habit !== "no") fail("habit", "Unsupported: extremes of muscle mass or body habitus limit creatinine-based estimates.");
  const female = v.sex === "female";
  const ratio = creatinine / 88.4 / (female ? 0.7 : 0.9);
  const gfr = 142 * Math.min(ratio, 1) ** (female ? -0.241 : -0.302) * Math.max(ratio, 1) ** -1.2 * 0.9938 ** years * (female ? 1.012 : 1);
  if (!Number.isFinite(gfr) || gfr <= 0) fail("creatinine", "Numeric overflow/underflow: no interpretable result produced.");
  return { gfr };
}
function finite(value, field) {
  if (!Number.isFinite(value)) fail(field, "Numeric overflow/underflow: no interpretable result produced.");
  return value;
}
function bmi(v) {
  const years = age(v.age, 18, 120);
  choice(v.pregnantOrLactating, "pregnantOrLactating");
  const weight2 = numeric(v.weight, "weight"), height2 = numeric(v.height, "height");
  const value = finite(weight2 / (height2 / 100) ** 2, "height");
  if (value <= 0) fail("height", "Numeric underflow: no interpretable result produced.");
  const band = value < 18.5 ? "Underweight" : value < 25 ? "Normal" : value < 30 ? "Overweight" : value < 35 ? "Obese class I" : value < 40 ? "Obese class II" : "Obese class III";
  return { bmi: value, band: v.pregnantOrLactating === "yes" ? null : band, older: years > 65 };
}
function bsa(v) {
  const height2 = numeric(v.height, "height"), weight2 = numeric(v.weight, "weight");
  const value = finite(Math.sqrt(height2 * weight2 / 3600), "weight");
  if (value <= 0) fail("weight", "Numeric underflow: no interpretable result produced.");
  return { bsa: value };
}
function fib4(v) {
  const years = numeric(v.age, "age");
  if (!Number.isInteger(years)) fail("age", "Enter completed whole years.");
  if (years < 18) fail("age", "Unsupported: FIB-4 is derived in adults, age ≥18.");
  const ast2 = numeric(v.ast, "ast"), alt2 = numeric(v.alt, "alt"), platelets2 = numeric(v.platelets, "platelets");
  const value = finite(years * ast2 / (platelets2 * Math.sqrt(alt2)), "platelets");
  if (value <= 0) fail("platelets", "Numeric underflow: no interpretable result produced.");
  const low = years >= 65 ? 2 : 1.3;
  return { fib4: value, band: value < low ? "Low" : value > 2.67 ? "High" : "Indeterminate", ageCaution: years < 35 };
}
function apri(v) {
  const ast2 = numeric(v.ast, "ast"), uln = numeric(v.uln, "uln"), platelets2 = numeric(v.platelets, "platelets");
  choice(v.acute, "acute");
  if (v.acute !== "no") fail("acute", "Unsupported: not for acute transaminitis.");
  const value = finite(ast2 * 100 / (uln * platelets2), "platelets");
  if (value <= 0) fail("platelets", "Numeric underflow: no interpretable result produced.");
  return { apri: value, band: value < 0.5 ? "Below 0.5" : value > 2 ? "Above 2.0" : value > 1.5 ? "Above 1.5" : "Midrange" };
}
var FIGGE_SLOPE = 0.25;
function anionGap(v) {
  const sodium = numeric(v.sodium, "sodium"), chloride = numeric(v.chloride, "chloride"), bicarbonate = numeric(v.bicarbonate, "bicarbonate");
  choice(v.convention, "convention", ["exclude", "include"]);
  const potassium = v.potassium === "" || v.potassium === void 0 ? null : numeric(v.potassium, "potassium");
  if (v.convention === "include" && potassium === null) fail("potassium", "Enter potassium for the potassium-included convention.");
  const albumin = v.albumin === "" || v.albumin === void 0 ? null : numeric(v.albumin, "albumin");
  if (albumin !== null || v.reference) choice(v.reference, "reference", ["44", "40"]);
  const gap = finite(sodium + (v.convention === "include" ? potassium : 0) - (chloride + bicarbonate), "sodium");
  return { gap, corrected: albumin === null ? null : finite(gap + FIGGE_SLOPE * (Number(v.reference) - albumin), "albumin"), convention: v.convention, reference: v.reference };
}
var GLUCOSE_MG_DL = 18.016;
var SODIUM_FACTORS = Object.freeze({ katz: 1.6, hillier: 2.4 });
function correctedSodium(v) {
  const sodium = numeric(v.sodium, "sodium"), glucose = numeric(v.glucose, "glucose");
  choice(v.formula, "formula", ["katz", "hillier"]);
  const glucoseMg = finite(glucose * GLUCOSE_MG_DL, "glucose");
  if (glucoseMg <= 100) return { sodium, formula: v.formula, highGlucose: false, noCorrection: true };
  return { sodium: finite(sodium + SODIUM_FACTORS[v.formula] * (glucoseMg - 100) / 100, "sodium"), formula: v.formula, highGlucose: glucoseMg > 400 };
}
var QTC_FRAMINGHAM = 0.154;
var QTC_HODGES_MS = 1.75;
function qtc(v) {
  const qt = numeric(v.qt, "qt"), hr = numeric(v.hr, "hr");
  choice(v.formula, "formula", ["bazett", "fridericia", "framingham", "hodges"]);
  const rr = finite(60 / hr, "hr");
  const value = v.formula === "bazett" ? qt / Math.sqrt(rr) : v.formula === "fridericia" ? qt / Math.cbrt(rr) : v.formula === "framingham" ? (qt / 1e3 + QTC_FRAMINGHAM * (1 - rr)) * 1e3 : qt + QTC_HODGES_MS * (hr - 60);
  if (value <= 0) fail("qt", "Numeric correction yields non-positive QTc; no interpretable result.");
  return { qtc: finite(value, "qt"), rr, formula: v.formula, outside: rr < 0.5 || rr > 1.47 };
}
function homaB(v) {
  const glucose = numeric(v.glucose, "glucose");
  if (glucose <= 3.5) fail("glucose", "Unsupported: HOMA1-B requires glucose >3.5 mmol/L (positive denominator).");
  const { insulinMu } = homa(v);
  const beta = finite(20 * insulinMu / (glucose - 3.5), "insulin");
  if (beta <= 0) fail("insulin", "Numeric underflow: no interpretable result produced.");
  return { beta };
}
function quicki(v) {
  const glucose = numeric(v.glucose, "glucose");
  const { insulinMu } = homa(v);
  const glucoseMg = finite(glucose * GLUCOSE_MG_DL, "glucose");
  const denominator = Math.log10(insulinMu) + Math.log10(glucoseMg);
  if (!Number.isFinite(denominator) || denominator <= 0) fail("glucose", "Undefined QUICKI: log-sum denominator must be finite and greater than zero.");
  return { quicki: finite(1 / denominator, "glucose") };
}
var CHA_AGE_POINTS = Object.freeze({ "under65": 0, "65-74": 1, "75plus": 2 });
function cha2ds2Vasc(v) {
  choice(v.af, "af");
  if (v.af !== "yes") fail("af", "Unsupported: this score is for non-valvular atrial fibrillation.");
  choice(v.ageBand, "ageBand", Object.keys(CHA_AGE_POINTS));
  choice(v.sex, "sex", ["male", "female"]);
  let score = CHA_AGE_POINTS[v.ageBand] + Number(v.sex === "female");
  for (const [field, points] of [["chf", 1], ["hypertension", 1], ["diabetes", 1], ["stroke", 2], ["vascular", 1]]) {
    choice(v[field], field);
    score += Number(v[field] === "yes") * points;
  }
  return { score, sexOnly: score === 1 && v.sex === "female" };
}
function hasBled(v) {
  choice(v.af, "af");
  if (v.af !== "yes") fail("af", "Unsupported: HAS-BLED is an AF bleeding-risk score.");
  const years = age(v.age, 18, 120);
  choice(v.anticoagulant, "anticoagulant", ["vka", "non-vka"]);
  choice(v.labile, "labile", ["yes", "no", "na"]);
  if (v.anticoagulant === "vka" && v.labile === "na") fail("labile", "For VKA/warfarin, explicitly assess labile INR; N/A is not accepted.");
  if (v.anticoagulant === "non-vka" && v.labile !== "na") fail("labile", "For non-VKA, explicitly select not applicable; labile INR scores zero.");
  let score = Number(years > 65) + Number(v.labile === "yes");
  for (const field of ["hypertension", "renal", "liver", "stroke", "bleeding", "drugs", "alcohol"]) {
    choice(v[field], field);
    score += Number(v[field] === "yes");
  }
  return { score, labile: v.labile };
}
var CG_CREATININE = 88.4;
var CG_FEMALE = 0.85;
function cockcroftGault(v) {
  choice(v.sex, "sex", ["male", "female"]);
  const years = age(v.age, 18, 92), weight2 = numeric(v.weight, "weight"), scr = numeric(v.creatinine, "creatinine");
  let crcl = (140 - years) * weight2 * CG_CREATININE / (72 * scr);
  if (v.sex === "female") crcl *= CG_FEMALE;
  finite(crcl, "creatinine");
  if (crcl <= 0) fail("creatinine", "Numeric underflow: no interpretable result produced.");
  return { crcl };
}
function riskBand(percent) {
  return percent < 10 ? "Low" : percent < 20 ? "Intermediate" : "High";
}

// src/expansion-vectors.js
var docVectors = {
  "bmi": [
    {
      "inputs": {
        "weight": "70",
        "height": "175",
        "age": "40",
        "pregnantOrLactating": "no"
      },
      "expected": {
        "bmi": "22.9"
      },
      "provenance": "Doc independent Python JSON bmi.V1"
    },
    {
      "inputs": {
        "weight": "95",
        "height": "170",
        "age": "40",
        "pregnantOrLactating": "no"
      },
      "expected": {
        "bmi": "32.9"
      },
      "provenance": "Doc independent Python JSON bmi.V2"
    },
    {
      "inputs": {
        "weight": "50",
        "height": "170",
        "age": "40",
        "pregnantOrLactating": "no"
      },
      "expected": {
        "bmi": "17.3"
      },
      "provenance": "Doc independent Python JSON bmi.V3"
    },
    {
      "inputs": {
        "weight": "81",
        "height": "180",
        "age": "40",
        "pregnantOrLactating": "no"
      },
      "expected": {
        "bmi": "25.0"
      },
      "provenance": "Doc independent Python JSON bmi.V4"
    },
    {
      "inputs": {
        "weight": "97.2",
        "height": "180",
        "age": "40",
        "pregnantOrLactating": "no"
      },
      "expected": {
        "bmi": "30.0"
      },
      "provenance": "Doc independent Python JSON bmi.V5"
    },
    {
      "inputs": {
        "weight": "60",
        "height": "165",
        "age": "40",
        "pregnantOrLactating": "no"
      },
      "expected": {
        "bmi": "22.0"
      },
      "provenance": "Doc independent Python JSON bmi.V6"
    },
    {
      "inputs": {
        "weight": "70",
        "height": "175",
        "pregnantOrLactating": "yes",
        "age": "40"
      },
      "expected": {
        "bmi": "22.9"
      },
      "provenance": "Doc independent Python JSON bmi.V7"
    }
  ],
  "bsa-mosteller": [
    {
      "inputs": {
        "height": "170",
        "weight": "70"
      },
      "expected": {
        "bsa": "1.82"
      },
      "provenance": "Doc independent Python JSON bsa.V1"
    },
    {
      "inputs": {
        "height": "180",
        "weight": "80"
      },
      "expected": {
        "bsa": "2.00"
      },
      "provenance": "Doc independent Python JSON bsa.V2"
    },
    {
      "inputs": {
        "height": "160",
        "weight": "50"
      },
      "expected": {
        "bsa": "1.49"
      },
      "provenance": "Doc independent Python JSON bsa.V3"
    }
  ],
  "cockcroft-gault": [
    {
      "inputs": {
        "age": "40",
        "weight": "70",
        "creatinine": "90",
        "sex": "male"
      },
      "expected": {
        "crcl": "95"
      },
      "provenance": "Doc independent Python JSON cockcroftGault.V1"
    },
    {
      "inputs": {
        "age": "40",
        "weight": "60",
        "creatinine": "80",
        "sex": "female"
      },
      "expected": {
        "crcl": "78"
      },
      "provenance": "Doc independent Python JSON cockcroftGault.V2"
    },
    {
      "inputs": {
        "age": "65",
        "weight": "80",
        "creatinine": "110",
        "sex": "male"
      },
      "expected": {
        "crcl": "67"
      },
      "provenance": "Doc independent Python JSON cockcroftGault.V3"
    },
    {
      "inputs": {
        "age": "72",
        "weight": "65",
        "creatinine": "120",
        "sex": "female"
      },
      "expected": {
        "crcl": "38"
      },
      "provenance": "Doc independent Python JSON cockcroftGault.V4"
    },
    {
      "inputs": {
        "age": "50",
        "weight": "70",
        "creatinine": "90",
        "sex": "male"
      },
      "expected": {
        "crcl": "86"
      },
      "provenance": "Doc independent Python JSON cockcroftGault.V5a"
    },
    {
      "inputs": {
        "age": "50",
        "weight": "70",
        "creatinine": "90",
        "sex": "female"
      },
      "expected": {
        "crcl": "73"
      },
      "provenance": "Doc independent Python JSON cockcroftGault.V5b"
    },
    {
      "inputs": {
        "age": "18",
        "weight": "70",
        "creatinine": "90",
        "sex": "male"
      },
      "expected": {
        "crcl": "117"
      },
      "provenance": "Doc independent Python JSON cockcroftGault.V6"
    },
    {
      "inputs": {
        "age": "92",
        "weight": "70",
        "creatinine": "90",
        "sex": "male"
      },
      "expected": {
        "crcl": "46"
      },
      "provenance": "Doc independent Python JSON cockcroftGault.V7"
    }
  ],
  "fib4": [
    {
      "inputs": {
        "age": "50",
        "ast": "30",
        "alt": "40",
        "platelets": "220"
      },
      "expected": {
        "fib4": "1.08"
      },
      "provenance": "Doc independent Python JSON fib4.V1"
    },
    {
      "inputs": {
        "age": "60",
        "ast": "80",
        "alt": "90",
        "platelets": "140"
      },
      "expected": {
        "fib4": "3.61"
      },
      "provenance": "Doc independent Python JSON fib4.V2"
    },
    {
      "inputs": {
        "age": "45",
        "ast": "45",
        "alt": "35",
        "platelets": "150"
      },
      "expected": {
        "fib4": "2.28"
      },
      "provenance": "Doc independent Python JSON fib4.V3"
    },
    {
      "inputs": {
        "age": "70",
        "ast": "35",
        "alt": "30",
        "platelets": "200"
      },
      "expected": {
        "fib4": "2.24"
      },
      "provenance": "Doc independent Python JSON fib4.V4"
    },
    {
      "inputs": {
        "age": "30",
        "ast": "35",
        "alt": "30",
        "platelets": "200"
      },
      "expected": {
        "fib4": "0.96"
      },
      "provenance": "Doc independent Python JSON fib4.V5"
    }
  ],
  "apri": [
    {
      "inputs": {
        "ast": "30",
        "uln": "40",
        "platelets": "220",
        "acute": "no"
      },
      "expected": {
        "apri": "0.34"
      },
      "provenance": "Doc independent Python JSON apri.V1"
    },
    {
      "inputs": {
        "ast": "110",
        "uln": "40",
        "platelets": "110",
        "acute": "no"
      },
      "expected": {
        "apri": "2.50"
      },
      "provenance": "Doc independent Python JSON apri.V2"
    },
    {
      "inputs": {
        "ast": "44",
        "uln": "40",
        "platelets": "220",
        "acute": "no"
      },
      "expected": {
        "apri": "0.50"
      },
      "provenance": "Doc independent Python JSON apri.V3"
    },
    {
      "inputs": {
        "ast": "132",
        "uln": "40",
        "platelets": "220",
        "acute": "no"
      },
      "expected": {
        "apri": "1.50"
      },
      "provenance": "Doc independent Python JSON apri.V4"
    },
    {
      "inputs": {
        "ast": "88",
        "uln": "40",
        "platelets": "110",
        "acute": "no"
      },
      "expected": {
        "apri": "2.00"
      },
      "provenance": "Doc independent Python JSON apri.V5"
    }
  ],
  "anion-gap": [
    {
      "inputs": {
        "sodium": "140",
        "chloride": "105",
        "bicarbonate": "24",
        "convention": "exclude",
        "potassium": "",
        "albumin": "",
        "reference": ""
      },
      "expected": {
        "gap": "11.0"
      },
      "provenance": "Doc independent Python JSON anionGap.V1"
    },
    {
      "inputs": {
        "sodium": "138",
        "potassium": "4.5",
        "chloride": "100",
        "bicarbonate": "12",
        "convention": "include",
        "albumin": "",
        "reference": ""
      },
      "expected": {
        "gap": "30.5"
      },
      "provenance": "Doc independent Python JSON anionGap.V2"
    },
    {
      "inputs": {
        "sodium": "140",
        "chloride": "110",
        "bicarbonate": "22",
        "albumin": "25",
        "convention": "exclude",
        "potassium": "",
        "reference": "44"
      },
      "expected": {
        "gap": "8.0",
        "corrected": "12.8"
      },
      "provenance": "Doc independent Python JSON anionGap.V3-ref44"
    },
    {
      "inputs": {
        "sodium": "140",
        "chloride": "110",
        "bicarbonate": "22",
        "albumin": "25",
        "convention": "exclude",
        "potassium": "",
        "reference": "40"
      },
      "expected": {
        "gap": "8.0",
        "corrected": "11.8"
      },
      "provenance": "Doc independent Python JSON anionGap.V3-ref40"
    }
  ],
  "corrected-sodium": [
    {
      "inputs": {
        "sodium": "128",
        "glucose": "30",
        "formula": "katz"
      },
      "expected": {
        "sodium": "135.0"
      },
      "provenance": "Doc independent Python JSON correctedSodium.V1-katz"
    },
    {
      "inputs": {
        "sodium": "128",
        "glucose": "30",
        "formula": "hillier"
      },
      "expected": {
        "sodium": "138.6"
      },
      "provenance": "Doc independent Python JSON correctedSodium.V1-hillier"
    },
    {
      "inputs": {
        "sodium": "135",
        "glucose": "8",
        "formula": "katz"
      },
      "expected": {
        "sodium": "135.7"
      },
      "provenance": "Doc independent Python JSON correctedSodium.V2-katz"
    },
    {
      "inputs": {
        "sodium": "135",
        "glucose": "8",
        "formula": "hillier"
      },
      "expected": {
        "sodium": "136.1"
      },
      "provenance": "Doc independent Python JSON correctedSodium.V2-hillier"
    },
    {
      "inputs": {
        "sodium": "140",
        "glucose": "45",
        "formula": "katz"
      },
      "expected": {
        "sodium": "151.4"
      },
      "provenance": "Doc independent Python JSON correctedSodium.V3-katz"
    },
    {
      "inputs": {
        "sodium": "140",
        "glucose": "45",
        "formula": "hillier"
      },
      "expected": {
        "sodium": "157.1"
      },
      "provenance": "Doc independent Python JSON correctedSodium.V3-hillier"
    }
  ],
  "qtc": [
    {
      "inputs": {
        "qt": "400",
        "hr": "60",
        "formula": "bazett"
      },
      "expected": {
        "qtc": "400"
      },
      "provenance": "Doc independent Python JSON qtc.V1-bazett"
    },
    {
      "inputs": {
        "qt": "400",
        "hr": "60",
        "formula": "fridericia"
      },
      "expected": {
        "qtc": "400"
      },
      "provenance": "Doc independent Python JSON qtc.V1-fridericia"
    },
    {
      "inputs": {
        "qt": "400",
        "hr": "60",
        "formula": "framingham"
      },
      "expected": {
        "qtc": "400"
      },
      "provenance": "Doc independent Python JSON qtc.V1-framingham"
    },
    {
      "inputs": {
        "qt": "400",
        "hr": "60",
        "formula": "hodges"
      },
      "expected": {
        "qtc": "400"
      },
      "provenance": "Doc independent Python JSON qtc.V1-hodges"
    },
    {
      "inputs": {
        "qt": "360",
        "hr": "100",
        "formula": "bazett"
      },
      "expected": {
        "qtc": "465"
      },
      "provenance": "Doc independent Python JSON qtc.V2-bazett"
    },
    {
      "inputs": {
        "qt": "360",
        "hr": "100",
        "formula": "fridericia"
      },
      "expected": {
        "qtc": "427"
      },
      "provenance": "Doc independent Python JSON qtc.V2-fridericia"
    },
    {
      "inputs": {
        "qt": "360",
        "hr": "100",
        "formula": "framingham"
      },
      "expected": {
        "qtc": "422"
      },
      "provenance": "Doc independent Python JSON qtc.V2-framingham"
    },
    {
      "inputs": {
        "qt": "360",
        "hr": "100",
        "formula": "hodges"
      },
      "expected": {
        "qtc": "430"
      },
      "provenance": "Doc independent Python JSON qtc.V2-hodges"
    },
    {
      "inputs": {
        "qt": "480",
        "hr": "50",
        "formula": "bazett"
      },
      "expected": {
        "qtc": "438"
      },
      "provenance": "Doc independent Python JSON qtc.V3-bazett"
    },
    {
      "inputs": {
        "qt": "480",
        "hr": "50",
        "formula": "fridericia"
      },
      "expected": {
        "qtc": "452"
      },
      "provenance": "Doc independent Python JSON qtc.V3-fridericia"
    },
    {
      "inputs": {
        "qt": "480",
        "hr": "50",
        "formula": "framingham"
      },
      "expected": {
        "qtc": "449"
      },
      "provenance": "Doc independent Python JSON qtc.V3-framingham"
    },
    {
      "inputs": {
        "qt": "480",
        "hr": "50",
        "formula": "hodges"
      },
      "expected": {
        "qtc": "463"
      },
      "provenance": "Doc independent Python JSON qtc.V3-hodges"
    }
  ],
  "homa1-b": [
    {
      "inputs": {
        "glucose": "5.8",
        "insulin": "114",
        "fasting": "yes",
        "exogenous": "no",
        "population": "yes"
      },
      "expected": {
        "beta": "165"
      },
      "provenance": "Doc independent Python JSON homaB.V1"
    },
    {
      "inputs": {
        "glucose": "5",
        "insulin": "60",
        "fasting": "yes",
        "exogenous": "no",
        "population": "yes"
      },
      "expected": {
        "beta": "133"
      },
      "provenance": "Doc independent Python JSON homaB.V2"
    },
    {
      "inputs": {
        "glucose": "7",
        "insulin": "80",
        "fasting": "yes",
        "exogenous": "no",
        "population": "yes"
      },
      "expected": {
        "beta": "76"
      },
      "provenance": "Doc independent Python JSON homaB.V3"
    }
  ],
  "quicki": [
    {
      "inputs": {
        "glucose": "5.8",
        "insulin": "114",
        "fasting": "yes",
        "exogenous": "no",
        "population": "yes"
      },
      "expected": {
        "quicki": "0.303"
      },
      "provenance": "Doc independent Python JSON quicki.V1"
    },
    {
      "inputs": {
        "glucose": "5",
        "insulin": "60",
        "fasting": "yes",
        "exogenous": "no",
        "population": "yes"
      },
      "expected": {
        "quicki": "0.338"
      },
      "provenance": "Doc independent Python JSON quicki.V2"
    },
    {
      "inputs": {
        "glucose": "6.5",
        "insulin": "90",
        "fasting": "yes",
        "exogenous": "no",
        "population": "yes"
      },
      "expected": {
        "quicki": "0.308"
      },
      "provenance": "Doc independent Python JSON quicki.V3"
    }
  ],
  "cha2ds2-vasc": [
    {
      "inputs": {
        "sex": "female",
        "chf": "yes",
        "hypertension": "no",
        "diabetes": "no",
        "stroke": "no",
        "vascular": "no",
        "af": "yes",
        "ageBand": "65-74"
      },
      "expected": {
        "score": "3"
      },
      "provenance": "Doc independent Python JSON cha2ds2Vasc.V1"
    },
    {
      "inputs": {
        "sex": "male",
        "chf": "no",
        "hypertension": "yes",
        "diabetes": "yes",
        "stroke": "no",
        "vascular": "no",
        "af": "yes",
        "ageBand": "75plus"
      },
      "expected": {
        "score": "4"
      },
      "provenance": "Doc independent Python JSON cha2ds2Vasc.V2"
    },
    {
      "inputs": {
        "sex": "female",
        "chf": "no",
        "hypertension": "no",
        "diabetes": "no",
        "stroke": "no",
        "vascular": "no",
        "af": "yes",
        "ageBand": "under65"
      },
      "expected": {
        "score": "1"
      },
      "provenance": "Doc independent Python JSON cha2ds2Vasc.V3"
    },
    {
      "inputs": {
        "sex": "male",
        "chf": "no",
        "hypertension": "no",
        "diabetes": "no",
        "stroke": "no",
        "vascular": "no",
        "af": "yes",
        "ageBand": "65-74"
      },
      "expected": {
        "score": "1"
      },
      "provenance": "Doc independent Python JSON cha2ds2Vasc.V4"
    },
    {
      "inputs": {
        "sex": "male",
        "chf": "no",
        "hypertension": "no",
        "diabetes": "no",
        "stroke": "no",
        "vascular": "no",
        "af": "yes",
        "ageBand": "75plus"
      },
      "expected": {
        "score": "2"
      },
      "provenance": "Doc independent Python JSON cha2ds2Vasc.V5"
    },
    {
      "inputs": {
        "sex": "female",
        "chf": "yes",
        "hypertension": "yes",
        "diabetes": "yes",
        "stroke": "yes",
        "vascular": "yes",
        "af": "yes",
        "ageBand": "75plus"
      },
      "expected": {
        "score": "9"
      },
      "provenance": "Doc independent Python JSON cha2ds2Vasc.V6"
    },
    {
      "inputs": {
        "sex": "male",
        "chf": "no",
        "hypertension": "no",
        "diabetes": "no",
        "stroke": "no",
        "vascular": "no",
        "af": "yes",
        "ageBand": "under65"
      },
      "expected": {
        "score": "0"
      },
      "provenance": "Doc independent Python JSON cha2ds2Vasc.V7"
    }
  ],
  "has-bled": [
    {
      "inputs": {
        "hypertension": "yes",
        "renal": "no",
        "liver": "no",
        "stroke": "no",
        "bleeding": "no",
        "age": "50",
        "drugs": "no",
        "alcohol": "no",
        "af": "yes",
        "anticoagulant": "vka",
        "labile": "no"
      },
      "expected": {
        "score": "1"
      },
      "provenance": "Doc independent Python JSON hasBled.V1"
    },
    {
      "inputs": {
        "hypertension": "yes",
        "renal": "yes",
        "liver": "yes",
        "stroke": "yes",
        "bleeding": "yes",
        "age": "66",
        "drugs": "yes",
        "alcohol": "yes",
        "af": "yes",
        "anticoagulant": "vka",
        "labile": "yes"
      },
      "expected": {
        "score": "9"
      },
      "provenance": "Doc independent Python JSON hasBled.V2"
    },
    {
      "inputs": {
        "hypertension": "no",
        "renal": "no",
        "liver": "no",
        "stroke": "no",
        "bleeding": "no",
        "age": "66",
        "drugs": "no",
        "alcohol": "no",
        "af": "yes",
        "anticoagulant": "vka",
        "labile": "no"
      },
      "expected": {
        "score": "1"
      },
      "provenance": "Doc independent Python JSON hasBled.V3"
    },
    {
      "inputs": {
        "hypertension": "no",
        "renal": "no",
        "liver": "no",
        "stroke": "no",
        "bleeding": "no",
        "age": "65",
        "drugs": "no",
        "alcohol": "no",
        "af": "yes",
        "anticoagulant": "vka",
        "labile": "no"
      },
      "expected": {
        "score": "0"
      },
      "provenance": "Doc independent Python JSON hasBled.V4"
    },
    {
      "inputs": {
        "hypertension": "no",
        "renal": "yes",
        "liver": "yes",
        "stroke": "no",
        "bleeding": "no",
        "age": "50",
        "drugs": "yes",
        "alcohol": "yes",
        "af": "yes",
        "anticoagulant": "vka",
        "labile": "no"
      },
      "expected": {
        "score": "4"
      },
      "provenance": "Doc independent Python JSON hasBled.V5"
    },
    {
      "inputs": {
        "hypertension": "no",
        "renal": "no",
        "liver": "no",
        "stroke": "no",
        "bleeding": "no",
        "age": "50",
        "drugs": "no",
        "alcohol": "no",
        "af": "yes",
        "anticoagulant": "vka",
        "labile": "yes"
      },
      "expected": {
        "score": "1"
      },
      "provenance": "Doc independent Python JSON hasBled.V7"
    }
  ]
};

// src/expansion-registry.js
var source = (title, url) => ({ title, url, accessed: "2026-10-26" });
var pubmed = (title, id) => source(title, `https://pubmed.ncbi.nlm.nih.gov/${id}/`);
var number = (id, label, unit, help = "Positive finite decimal; numeric sanity guard, not a validated clinical range.") => ({ id, label, unit, help, type: "number" });
var select = (id, label, options, help) => ({ id, label, unit: "choice (unitless)", type: "choice", help, options: options.map(([value, label2, points]) => ({ value, label: label2, ...points === void 0 ? {} : { points } })) });
var yesno = (id, label, help) => select(id, label, [["yes", "Yes"], ["no", "No"]], help || "Explicit answer required; blank is not No.");
var age2 = number("age", "Age", "completed years", "Completed whole years; 120 is an engineering sanity ceiling, not a validated upper age.");
var weight = number("weight", "Weight", "kg");
var height = number("height", "Height", "cm");
var clinicalReview = "Clinician decision support — verify applicability and consult the model references. Release review evidence is recorded in the project documentation.";
function definition(d) {
  return { aliases: [d.id], clinicalReview, conversion: "Canadian units as labelled; no conversion unless stated in method.", validation: "Required explicit answers and positive finite decimals. No clamping; full precision before display rounding. Numeric bounds are engineering guards, not clinical validation ranges.", ...d };
}
var expansion = [
  definition({
    id: "bmi",
    name: "Adult BMI",
    category: "Anthropometry",
    version: "Health Canada / WHO adult classification (2003)",
    endpoint: "Body mass index and adult weight classification, not a diagnosis.",
    applicability: "Adults ≥18; pregnancy/lactation suppresses classification, not numeric BMI. Can misclassify muscular, very lean and not fully grown adults, and adults >65. Waist circumference is a companion measure, not an output. Age 120 is only an engineering ceiling.",
    method: "BMI = weight kg / (height cm / 100)². Health Canada bands: <18.5 underweight; <25 normal; <30 overweight; <35 obese class I; <40 class II; otherwise class III. Unrounded classification; 1-decimal display.",
    inputs: [weight, height, age2, yesno("pregnantOrLactating", "Pregnant or lactating?", "Yes suppresses the weight class, not the numeric BMI.")],
    outputs: [{ key: "bmi", label: "BMI", unit: "kg/m²", decimals: 1 }],
    calculate: bmi,
    interpretation: (r) => `${r.band === null ? "Weight classification is not applicable during pregnancy or lactation (Health Canada 2003)" : r.band}. ${r.older ? "Age >65: classification may misclassify. " : ""}BMI plus waist circumference informs assessment; no diagnosis inferred.`,
    sources: [source("Health Canada, Canadian Guidelines for Body Weight Classification in Adults", "https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/healthy-weights/canadian-guidelines-body-weight-classification-adults/questions-answers-public.html"), pubmed("Douketis et al., CMAJ 2005", "15824401")]
  }),
  definition({
    id: "bsa-mosteller",
    name: "Body surface area — Mosteller",
    category: "Anthropometry",
    version: "Mosteller 1987",
    endpoint: "Estimated body surface area in m², not a dosing recommendation.",
    applicability: "Adult and paediatric anthropometry for physiology indexing; not validated at extremes of habitus. Does not calculate medication doses.",
    method: "BSA = sqrt(height cm × weight kg / 3600). Mosteller only; DuBois is a different formula and is not blended. Display 2 decimals.",
    inputs: [height, weight],
    outputs: [{ key: "bsa", label: "BSA (Mosteller)", unit: "m²", decimals: 2 }],
    calculate: bsa,
    interpretation: () => "Named Mosteller estimate; extremes of habitus limit applicability.",
    sources: [pubmed("Mosteller, NEJM 1987", "3657876")]
  })
];
var ast = number("ast", "AST", "U/L");
var alt = number("alt", "ALT", "U/L");
var platelets = number("platelets", "Platelet count", "×10⁹/L", "Enter e.g. 220, not 220000; thrombocytopenia from non-hepatic causes inflates fibrosis indices.");
expansion.push(definition({
  id: "apri",
  name: "APRI",
  category: "Hepatic",
  version: "Wai 2003 — AST-to-Platelet Ratio Index",
  endpoint: "Chronic liver fibrosis screening index, not a diagnosis.",
  applicability: "Validated in treatment-naïve chronic HCV; other chronic liver disease use is off-label screening. Not for acute transaminitis; non-hepatic thrombocytopenia inflates the index. APRI alone cannot reliably exclude significant disease.",
  method: "APRI = (AST / local AST ULN) × 100 / platelets in ×10⁹/L. <0.5 favours exclusion; >1.5 favours significant fibrosis / possible cirrhosis; >2 is more specific for cirrhosis with falling sensitivity. Exact 1.5 and 2.0 are not above those thresholds. Display 2 decimals; unrounded decisions.",
  inputs: [ast, number("uln", "Local AST upper limit of normal", "U/L", "Common reference 40 U/L; enter and verify the local lab ULN explicitly. Editable; never assumed."), platelets, yesno("acute", "Acute hepatitis or acute transaminitis?", "Yes blocks APRI.")],
  outputs: [{ key: "apri", label: "APRI", unit: "index (unitless)", decimals: 2 }],
  calculate: apri,
  interpretation: (r) => `${r.band}. Screening only, not a cirrhosis diagnosis. Local ULN matters; secondary assessment may be needed. APRI alone cannot reliably exclude significant disease.`,
  sources: [pubmed("Wai et al., Hepatology 2003", "12883497")]
}));
expansion.push(definition({
  id: "anion-gap",
  name: "Anion gap",
  category: "Electrolytes / Acid–base",
  version: "K-excluded / K-included; Figge 1998 albumin correction",
  endpoint: "Calculated serum anion gap, optionally albumin corrected.",
  applicability: "Laboratory calculation, not a diagnosis. Interpret the full panel and local reference range. Albumin must be from the same sample. Different potassium conventions have different reference intervals.",
  method: "K-excluded: Na − (Cl + HCO₃); K-included: Na + K − (Cl + HCO₃). Traditional references 8–12 and 12–16 mmol/L respectively; local assays differ. Figge correction = raw AG + 0.25 × (reference albumin − measured albumin g/L). Choose Figge 44 g/L or common 40 g/L variant explicitly when correcting. Display 1 decimal.",
  conversion: "All electrolytes mmol/L; albumin g/L. 0.25 per g/L equals 2.5 per g/dL.",
  inputs: [number("sodium", "Sodium", "mmol/L"), number("chloride", "Chloride", "mmol/L"), number("bicarbonate", "Bicarbonate", "mmol/L"), select("convention", "Potassium convention", [["exclude", "Exclude potassium"], ["include", "Include potassium"]], "Deliberate choice; no default."), { ...number("potassium", "Potassium", "mmol/L", "Required when potassium is included; optional otherwise, but validated if entered."), optional: true }, { ...number("albumin", "Albumin (optional)", "g/L", "Blank means uncorrected; if entered, use the same sample and choose a reference."), optional: true }, { ...select("reference", "Albumin correction reference", [["44", "Figge reference 44 g/L"], ["40", "Common variant 40 g/L"]], "Required if albumin entered; no silent default. Figge 44 g/L is the original reference."), optional: true }],
  outputs: [{ key: "gap", label: "Raw anion gap", unit: "mmol/L", decimals: 1 }, { key: "corrected", label: "Albumin-corrected gap", unit: "mmol/L", decimals: 1 }],
  calculate: anionGap,
  interpretation: (r) => `${r.convention === "include" ? "Potassium included (traditional reference 12–16 mmol/L)" : "Potassium excluded (traditional reference 8–12 mmol/L)"}. ${r.corrected === null ? "Uncorrected: no albumin correction applied." : `Albumin corrected using reference ${r.reference} g/L.`} Local assay reference and full clinical context required.`,
  sources: [pubmed("Figge et al., Crit Care Med 1998", "9824071"), source("Emmett & Narins, Medicine 1977;56:38–54", "https://pubmed.ncbi.nlm.nih.gov/401925/")]
}));
expansion.push(definition({
  id: "corrected-sodium",
  name: "Glucose-corrected sodium",
  category: "Electrolytes / Acid–base",
  version: "Katz 1973 / Hillier 1999 — deliberate choice",
  endpoint: "Estimated sodium corrected for hyperglycaemia, not a treatment target.",
  applicability: "Hyperglycaemia only (>100 mg/dL glucose). Physiological relation is nonlinear; Hillier derivation was small (n=6 healthy subjects). Never silently applies a high-glucose factor or returns lower sodium at non-hyperglycaemic values.",
  method: "Corrected Na = measured Na + factor × (glucose mg/dL − 100) / 100. Katz factor 1.6; Hillier 2.4. Hillier found ~4.0 above 400 mg/dL; this nonlinear caveat is flagged, NOT automatically applied. Display 1 decimal.",
  conversion: "Glucose mmol/L ×18.016 = mg/dL; Na mmol/L equals mEq/L.",
  inputs: [number("sodium", "Measured sodium", "mmol/L"), number("glucose", "Glucose", "mmol/L"), select("formula", "Correction formula", [["katz", "Katz 1973 (1.6)"], ["hillier", "Hillier 1999 (2.4)"]], "Choose deliberately; no default or mixed factors.")],
  outputs: [{ key: "sodium", label: "Corrected sodium", unit: "mmol/L", decimals: 1 }],
  calculate: correctedSodium,
  interpretation: (r) => `${r.formula === "katz" ? "Katz 1973 (1.6)" : "Hillier 1999 (2.4)"}. ${r.noCorrection ? "No hyperglycaemia correction indicated; measured sodium reported unchanged. " : ""}${r.highGlucose ? "Glucose >400 mg/dL: nonlinear relationship; Hillier reported a ~4.0 factor here, not applied. " : ""}Estimate only; interpret in clinical context, not as a treatment target.`,
  sources: [pubmed("Katz, NEJM 1973", "4763428"), pubmed("Hillier et al., Am J Med 1999", "10225241")]
}));
expansion.push(definition({
  id: "qtc",
  name: "QTc",
  category: "Cardiovascular",
  version: "Bazett / Fridericia / Framingham (Sagie) / Hodges",
  endpoint: "Rate-corrected QT interval from manually measured QT and heart rate.",
  applicability: "Measure QT consistently; this tool does not measure the ECG. Bazett overcorrects above 60 bpm and undercorrects below 60. Fridericia is more rate-stable; correction quality degrades outside RR 0.5–1.47 s (flagged, not clamped). No QT-prolongation diagnosis or treatment threshold.",
  method: "RR seconds = 60 / HR. Bazett QTc = QT / sqrt(RR); Fridericia QT / cbrt(RR); Framingham QT seconds + 0.154 × (1 − RR); Hodges QT ms + 1.75 × (HR − 60). QTc displayed as whole ms, RR to 3 decimals. Sagie ranges: RR 0.5–1.47 s; QT men 240–490 ms / women 260–480 ms.",
  conversion: "QT entered in ms; Framingham seconds coefficient ×1000 for ms output. RR in seconds, HR bpm.",
  inputs: [number("qt", "Measured QT", "ms"), number("hr", "Heart rate", "bpm"), select("formula", "QT correction formula", [["bazett", "Bazett 1920"], ["fridericia", "Fridericia 1920"], ["framingham", "Framingham (Sagie 1992)"], ["hodges", "Hodges 1983"]], "Deliberate choice; no default.")],
  outputs: [{ key: "qtc", label: "QTc", unit: "ms", decimals: 0 }, { key: "rr", label: "Calculated RR", unit: "s", decimals: 3 }],
  calculate: qtc,
  interpretation: (r) => `${{ bazett: "Bazett 1920", fridericia: "Fridericia 1920", framingham: "Framingham (Sagie 1992)", hodges: "Hodges 1983" }[r.formula]}. ${r.outside ? "Outside the validated correction range RR 0.5–1.47 s. " : ""}Bazett is rate-biased; no diagnosis inferred.`,
  sources: [pubmed("Sagie et al., Am J Cardiol 1992", "1519533"), source("Bazett, Heart 1920;7:353–70", "https://doi.org/10.1136/hrt.7.4.353"), source("Fridericia, Acta Med Scand 1920;53:469–86", "https://doi.org/10.1111/j.0954-6820.1920.tb18266.x"), source("Hodges, Salerno & Erlien, JACC 1983;1:694 (citation)", "https://pubmed.ncbi.nlm.nih.gov/?term=Hodges+Salerno+Erlien+QT+1983")]
}));
var metabolicInputs = [number("glucose", "Fasting glucose", "mmol/L"), number("insulin", "Fasting insulin", "pmol/L"), yesno("fasting", "Overnight fast ≥8 hours, water only?", "No blocks steady-state fasting estimates."), yesno("exogenous", "Using exogenous insulin?", "Yes invalidates endogenous-insulin estimates."), yesno("population", "Non-diabetic or early untreated dysglycaemia?", "No blocks: established beta-cell failure and glucose-lowering treatment distort the estimate.")];
var metabolicApplicability = "Overnight fast ≥8 hours, water only; endogenous insulin; non-diabetic or early untreated dysglycaemia. Not for exogenous insulin, established beta-cell failure or glucose-lowering treatment. Assays are not standardised; no universal diagnostic cutoff. Not HOMA2.";
expansion.push(definition({
  id: "homa1-b",
  name: "HOMA1-B beta-cell function",
  category: "Metabolic / Endocrine",
  aliases: ["HOMA-B", "beta cell", "insulin"],
  version: "Matthews 1985 — linear HOMA1 beta-cell function",
  endpoint: "Fasting estimated beta-cell function (%), not HOMA2.",
  applicability: metabolicApplicability,
  method: "HOMA1-B% = 20 × insulin mU/L / (glucose mmol/L − 3.5). Glucose ≤3.5 blocks (non-positive denominator). Reference normal 100%, not a universal diagnostic cutoff. Whole % display.",
  conversion: "Insulin pmol/L ÷6.0 = mU/L, per prior Doc decision; Knopp exact full-text recommendation was inaccessible (disclosed evidence limit).",
  inputs: metabolicInputs,
  outputs: [{ key: "beta", label: "HOMA1-B", unit: "%", decimals: 0 }],
  calculate: homaB,
  interpretation: () => "HOMA1, not HOMA2. Assay- and population-dependent estimate; no diagnosis inferred.",
  sources: [pubmed("Matthews et al., Diabetologia 1985", "3899825"), pubmed("Knopp et al., insulin units (abstract)", "30318910")]
}));
expansion.push(definition({
  id: "quicki",
  name: "QUICKI",
  category: "Metabolic / Endocrine",
  aliases: ["insulin", "insulin sensitivity"],
  version: "Katz 2000 — Quantitative Insulin Sensitivity Check Index",
  endpoint: "Fasting insulin-sensitivity index, not a diagnostic classification.",
  applicability: metabolicApplicability,
  method: "QUICKI = 1 / (log10(insulin mU/L) + log10(glucose mg/dL)). Positive inputs and positive log-sum denominator required. No universal diagnostic threshold; 0.45 is not a Katz diagnostic cutoff. Display 3 decimals.",
  conversion: "Glucose mmol/L ×18.016 = mg/dL (unlike HOMA). Insulin pmol/L ÷6.0 = mU/L; prior Doc unit decision and disclosed full-text evidence limitation.",
  inputs: metabolicInputs,
  outputs: [{ key: "quicki", label: "QUICKI", unit: "index (unitless)", decimals: 3 }],
  calculate: quicki,
  interpretation: () => "No universal diagnostic cutoff; fasting, assay and population dependent. No diagnosis inferred.",
  sources: [pubmed("Katz et al., JCEM 2000", "10902785"), pubmed("Knopp et al., insulin units (abstract)", "30318910")]
}));
var af = yesno("af", "Confirmed non-valvular atrial fibrillation?", "No blocks this AF risk score; not a general-population treatment rule.");
var modelSex = select("sex", "Sex used by the published score", [["male", "Male"], ["female", "Female"]], "Published score categories only; not inferred from identity.");
expansion.push(definition({
  id: "cha2ds2-vasc",
  name: "CHA₂DS₂-VASc",
  category: "Cardiovascular",
  aliases: ["CHA2DS2-VASc", "AF", "stroke"],
  version: "Lip 2010 — stroke/TE risk score, not CCS CHADS-65",
  endpoint: "Stroke/thromboembolism risk-stratification points in non-valvular AF; no treatment recommendation.",
  applicability: "Non-valvular AF. NOT the preferred Canadian anticoagulation algorithm: CCS 2020 uses CHADS-65. Female sex is a risk modifier; sex-only score 1 is not an anticoagulation indication. No annual-risk percentage is inferred.",
  method: "CHF/LV dysfunction +1; hypertension +1; diabetes +1; prior stroke/TIA/systemic embolism +2; vascular disease +1; female sex +1. Mutually exclusive age choice: <65 +0, 65–74 +1, ≥75 +2 (never add both age bands). Total 0–9.",
  inputs: [af, select("ageBand", "Age band", [["under65", "Under 65 years", 0], ["65-74", "65–74 years", 1], ["75plus", "75 years or older", 2]], "One mutually exclusive age band; age 74 →1, age 75 →2."), modelSex, yesno("chf", "Congestive heart failure or LV dysfunction?"), yesno("hypertension", "Hypertension (treated or untreated)?"), yesno("diabetes", "Diabetes mellitus?"), yesno("stroke", "Prior stroke, TIA or systemic embolism?", "Two points if Yes."), yesno("vascular", "Vascular disease?", "Prior MI, peripheral arterial disease or aortic plaque.")],
  outputs: [{ key: "score", label: "CHA₂DS₂-VASc", unit: "points", decimals: 0 }],
  calculate: cha2ds2Vasc,
  interpretation: (r) => `${r.sexOnly ? "Female-sex-only score 1 is not an anticoagulation indication. " : ""}Risk stratification only; CHA₂DS₂-VASc does not drive the CCS anticoagulation decision. CCS 2020 uses CHADS-65, not this score. No automatic treatment recommendation.`,
  sources: [pubmed("Lip et al., Chest 2010", "19762550"), source("CCS 2020 AF guideline: stroke prevention / CCS algorithm", "https://ccs.ca/guideline/2020-atrial-fibrillation/chapter-8-stroke-prevention/"), source("BC Guidelines: atrial fibrillation", "https://www2.gov.bc.ca/gov/content/health/practitioner-professional-resources/bc-guidelines/atrial-fibrillation")]
}));
expansion.push(definition({
  id: "has-bled",
  name: "HAS-BLED",
  category: "Cardiovascular",
  aliases: ["AF", "bleeding", "HASBLED"],
  version: "Pisters 2010 — independent renal/liver and drugs/alcohol",
  endpoint: "AF 1-year major-bleeding risk-stratification points; no annual percentage inferred.",
  applicability: "AF risk-factor assessment. A high HAS-BLED score is never an automatic reason to deny or withhold anticoagulation; identifies modifiable risks and closer follow-up. Labile INR applies only to VKA/warfarin. Adult age 120 ceiling is engineering sanity, not a validated upper limit.",
  method: "One point each: uncontrolled SBP >160; abnormal renal; abnormal liver; stroke; bleeding/predisposition; labile INR (VKA only); age >65; antiplatelet/NSAID; alcohol ≥8 drinks/week. Renal+liver and drugs+alcohol each allow TWO points. Maximum 9. Strict age >65: 65 scores 0, 66 scores 1.",
  inputs: [af, age2, yesno("hypertension", "Uncontrolled hypertension: systolic BP >160 mmHg?", "Strict >160, not ≥160."), yesno("renal", "Abnormal renal function?", "Chronic dialysis, renal transplant or serum creatinine ≥200 µmol/L."), yesno("liver", "Abnormal liver function?", "Cirrhosis or bilirubin >2×ULN with AST/ALT/ALP >3×ULN. Independent from renal function."), yesno("stroke", "History of stroke?"), yesno("bleeding", "Bleeding history or predisposition?", "Includes anaemia."), select("anticoagulant", "VKA/warfarin status", [["vka", "VKA / warfarin"], ["non-vka", "Not using VKA (including DOAC)"]], "Determines applicability of labile INR only; not a medication recommendation."), select("labile", "Labile INR or poor time in therapeutic range?", [["yes", "Yes (VKA only)"], ["no", "No (VKA only)"], ["na", "Not applicable — not using VKA"]], "Unstable/high INR or TTR <60%. For non-VKA explicitly choose N/A, scores zero."), yesno("drugs", "Concomitant antiplatelet or NSAID?", "The assessed anticoagulant itself is not counted."), yesno("alcohol", "Alcohol ≥8 drinks per week?", "Independent from the drug point; both may score.")],
  outputs: [{ key: "score", label: "HAS-BLED", unit: "points", decimals: 0 }],
  calculate: hasBled,
  interpretation: (r) => `Labile INR: ${r.labile === "na" ? "N/A (not on warfarin)" : r.labile === "yes" ? "Yes (VKA)" : "No"}. A high HAS-BLED score is never an automatic reason to deny or withhold anticoagulation. Identify modifiable bleeding risks and closer follow-up; no automatic treatment recommendation.`,
  sources: [pubmed("Pisters et al., Chest 2010", "20299623"), source("ClinCalc HAS-BLED definitions", "https://clincalc.com/Cardiology/HASBLED.aspx")]
}));
expansion.push(definition({
  id: "fib4",
  name: "FIB-4",
  category: "Hepatic",
  version: "Sterling 2006 equation; adopted clinical / age-adjusted bands",
  endpoint: "Fibrosis screening index, not a cirrhosis diagnosis.",
  applicability: "Derived in HIV/HCV coinfection; adopted clinical screening in NAFLD/MASLD. Less reliable below age 35 and with non-hepatic thrombocytopenia; age ≥65 uses an adjusted low threshold. Not for acute hepatitis. No CASL-specific cutoff endorsement verified.",
  method: "FIB-4 = age × AST / (platelets × sqrt(ALT)). Adopted clinical bands: <1.30 low, >2.67 high, otherwise indeterminate; age ≥65 low cutoff <2.0. Original Sterling derivation cutoffs <1.45 / >3.25 are NOT the displayed clinical bands. Classify before 2-decimal rounding.",
  inputs: [{ ...age2, help: "Completed positive whole years. Less reliable age <35; age-adjusted low cutoff at ≥65." }, ast, alt, platelets],
  outputs: [{ key: "fib4", label: "FIB-4", unit: "index (unitless)", decimals: 2 }],
  calculate: fib4,
  interpretation: (r) => `${r.band} adopted clinical band (age-adjusted low threshold at ≥65). ${r.ageCaution ? "Less reliable below age 35; interpret with caution. " : ""}FIB-4 is not valid in acute hepatitis / acute transaminitis / acute illness; do not use during an acute episode. Screening/triage only; secondary assessment may be needed, not biopsy-by-default.`,
  sources: [pubmed("Sterling et al., Hepatology 2006", "16729309"), source("2024 FIB-4 diagnostic accuracy meta-analysis; clinical thresholds", "https://doi.org/10.3350/cmh.2024.0330")]
}));
expansion.push(definition({
  id: "cockcroft-gault",
  name: "Cockcroft–Gault creatinine clearance",
  category: "Renal",
  aliases: ["CrCl", "creatinine", "Cockcroft"],
  version: "Cockcroft & Gault 1976 — exact SI equation",
  endpoint: "Estimated creatinine clearance (mL/min), NOT indexed eGFR.",
  applicability: "Derivation: 249 men, age 18–92. Female ×0.85 is an estimated adjustment, not a measured female cohort. Unreliable in pregnancy, acute/unstable kidney injury and extremes of muscle mass; liver disease/low creatinine production and obesity limit interpretation. Predates IDMS-standardised assays. Not indexed to 1.73 m² and not CKD-EPI eGFR.",
  validation: "Reject age <18 or >92 (derivation range), non-whole age and non-positive/non-finite weight or creatinine. No clamping. Weight basis must be clinician assessed.",
  method: "CrCl = ((140 − age) × supplied weight kg × 88.4) / (72 × serum creatinine µmol/L); multiply by 0.85 if female. Display whole mL/min, precision retained. One clinician-supplied weight only: no ideal/adjusted-weight formula is computed.",
  conversion: "Exact creatinine factor 88.4; not rounded SI factor 1.23. Female multiplier 0.85.",
  inputs: [{ ...age2, help: "Derivation range 18–92 completed years; outside rejected." }, modelSex, number("weight", "Clinician-supplied weight basis", "kg", "Choose the appropriate weight basis clinically. Actual body weight can overestimate in obesity; ideal/adjusted weights must be calculated separately using your chosen reference. No formula assumed."), number("creatinine", "Serum creatinine", "µmol/L")],
  outputs: [{ key: "crcl", label: "Creatinine clearance", unit: "mL/min", decimals: 0 }],
  calculate: cockcroftGault,
  interpretation: () => "CrCl is not indexed eGFR. Actual body weight may overestimate in obesity; no ideal/adjusted-weight formula applied. Unstable creatinine, pregnancy and abnormal muscle mass limit reliability. No dose or treatment recommendation.",
  sources: [pubmed("Cockcroft & Gault, Nephron 1976", "1244564")]
}));
for (const d of expansion) d.vectors = docVectors[d.id];

// src/registry.js
var source2 = (title, url) => ({ title, url, accessed: "2026-10-26" });
var pubmed2 = (title, pmid) => source2(title, `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`);
var number2 = (id, label, unit, help) => ({ id, label, unit, help, type: "number" });
var yesno2 = (id, label, help) => ({ id, label, unit: "choice (unitless)", help, type: "choice", options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }] });
var sex = { id: "sex", label: "Sex used by the published equation", unit: "model category (unitless)", type: "choice", help: "The source model supplies male/female coefficients only; no inference from identity or treatment. Applicability outside these model categories is not established.", options: [{ value: "male", label: "Male coefficient" }, { value: "female", label: "Female coefficient" }] };
var age3 = number2("age", "Age", "completed years", "Enter completed whole years; age limits below distinguish model applicability from engineering sanity guards.");
var review = "Clinician decision support — verify applicability and consult the model references. Release review evidence is recorded in the project documentation.";
var frsInputs = { sex: "male", age: "55", tc: "5.5", hdl: "1.1", sbp: "135", treated: "no", smoker: "no", diabetes: "no", cvd: "no", genetic: "no", bypass: "no", family: "no" };
var homaInputs = { glucose: "5.8", insulin: "114", fasting: "yes", exogenous: "no", population: "yes" };
var egfrInputs = { sex: "female", age: "55", creatinine: "80", stable: "yes", habit: "no" };
var registry = [
  {
    id: "framingham",
    name: "Framingham 10-year general CVD risk",
    category: "Cardiovascular",
    aliases: ["FRS", "cardiovascular", "cholesterol"],
    version: "D’Agostino 2008 — exact lipid Cox equation + CCS/BC reporting layer",
    endpoint: "10-year general CVD: coronary death, MI, coronary insufficiency, angina, stroke, TIA, PAD and heart failure; not hard CHD or ASCVD.",
    applicability: "Primary prevention, age 30–74, no established CVD/HF. Not for familial/genetic dyslipidaemia or statin-indicated high-risk conditions that bypass FRS. Canadian doubling only at age 30–59, without diabetes, with premature first-degree family history. Estimate only; calibration varies by population. No diagnosis or treatment recommendation.",
    validation: "Age 30–74 is the derivation range. Public FHS Sheet_1 bounds (not cohort predictor validation): SBP 90–200 mmHg; TC 100–405 mg/dL; HDL 10–100 mg/dL; TC must exceed HDL. Positive finite numbers and whole-year age are numeric guards. Reject outside these bounds; do not clamp. Canadian doubled values above 100% are blocked, not capped.",
    conversion: "TC and HDL mmol/L × 38.67 = mg/dL. Exact public-tool bounds in Canadian units: TC 100/38.67 to 405/38.67 mmol/L; HDL 10/38.67 to 100/38.67 mmol/L. Approximate displayed decimals are not validation boundaries.",
    method: "Risk (%) = 100 × [1 − S0 ^ exp(ΣβX − C)]. Natural logs of age, TC/HDL in mg/dL and SBP. Men: S0=.88936, C=23.9802; β age=3.06117, TC=1.12370, HDL=−.93263, SBP untreated=1.93303 / treated=1.99881, smoker=.65451, diabetes=.57367. Women: S0=.95012, C=26.1931; β age=2.32888, TC=1.20904, HDL=−.70833, SBP untreated=2.76157 / treated=2.82263, smoker=.52873, diabetes=.69154. Indicators 0/1. Canadian reporting: multiply by 2 only for the specified family-history population. Low <10%, Intermediate ≥10% and <20%, High ≥20%, applied before display rounding. Paper point scores are approximations and can differ.",
    clinicalReview: review,
    sources: [pubmed2("D’Agostino et al., Circulation 2008", "18212285"), source2("FHS official coefficients and lipid spreadsheet", "https://www.framinghamheartstudy.org/fhs-for-researchers/fhs-risk-functions/cardiovascular-disease-10-year-risk/"), source2("CCS FRS 2017", "https://ccs.ca/app/uploads/2020/12/FRS_eng_2017_fnl1.pdf"), source2("BC Guidelines Appendix B, December 2021", "https://www2.gov.bc.ca/assets/gov/health/practitioner-pro/bc-guidelines/gpac_cardiovasculardisease_appendixb_dec2021.pdf"), source2("BC CVD primary prevention guideline", "https://www2.gov.bc.ca/gov/content/health/practitioner-professional-resources/bc-guidelines/cardiovascular-disease")],
    inputs: [sex, age3, number2("tc", "Total cholesterol", "mmol/L", "FHS public-tool bounds 100–405 mg/dL internally, approximately 2.586–10.473 mmol/L."), number2("hdl", "HDL cholesterol", "mmol/L", "FHS public-tool bounds 10–100 mg/dL internally, approximately 0.259–2.586 mmol/L; below total cholesterol."), number2("sbp", "Systolic blood pressure", "mmHg", "FHS public-tool bounds 90–200 mmHg."), yesno2("treated", "Receiving antihypertensive treatment?", "Select the treated or untreated coefficient deliberately."), yesno2("smoker", "Current smoker?", "Source-model smoking indicator."), yesno2("diabetes", "Diabetes?", "Source-model diabetes indicator. Separately assess whether a statin-indicated condition bypasses FRS."), yesno2("cvd", "Established CVD or heart failure?", "Includes coronary disease, stroke/TIA, PAD or HF. Yes blocks this primary-prevention tool."), yesno2("genetic", "Familial hypercholesterolaemia or genetic dyslipidaemia?", "Yes is outside this tool’s scope."), yesno2("bypass", "Other statin-indicated high-risk condition bypassing FRS?", "Clinician assessment required: e.g. clinical atherosclerosis/AAA; most diabetes by age/duration; CKD age ≥50 with eGFR <60 or ACR >3 mg/mmol. This is not an automated treatment checklist. Yes blocks the estimate."), yesno2("family", "Premature CVD in a first-degree relative?", "Relative affected before age 55 if male or before 65 if female. Canadian multiplier applies only if patient age 30–59 and no diabetes.")],
    outputs: [{ key: "risk", label: "Base equation risk", unit: "%", decimals: 1 }, { key: "modifiedRisk", label: "Canadian reporting risk", unit: "%", decimals: 1 }],
    calculate: framingham,
    interpretation: (r) => `${r.band} Canadian risk band, based on the unrounded Canadian reporting risk. ${r.modifierApplied ? "Premature-family-history doubling applied (Canadian adaptation, not part of the base equation)." : "Canadian family-history doubling not applicable."} Risk estimate only.`,
    vectors: [{ inputs: frsInputs, expected: { risk: "14.6", modifiedRisk: "14.6" }, provenance: "Doc §2.9 A, independently derived published coefficients" }, { inputs: { ...frsInputs, sex: "female", age: "30", tc: "4.65", hdl: "1.16", sbp: "125" }, expected: { risk: "1.3" }, provenance: "Doc §2.9 FHS spreadsheet cross-check" }, { inputs: { ...frsInputs, sex: "female", tc: "6", hdl: "1", sbp: "145", treated: "yes", smoker: "yes" }, expected: { risk: "24.7" }, provenance: "Doc §2.9 B" }]
  },
  {
    id: "homa1-ir",
    name: "HOMA1-IR",
    category: "Metabolic / Endocrine",
    aliases: ["insulin", "insulin resistance", "HOMA"],
    version: "Matthews 1985 — original linear HOMA1",
    endpoint: "Fasting homeostasis-model insulin resistance index; not HOMA2.",
    applicability: "Overnight fast ≥8 h, water only; endogenous insulin; non-diabetic or early untreated dysglycaemia. Not valid with exogenous insulin or non-fasting samples; beta-cell failure and glucose-lowering treatment distort estimates. Assays are not standardised; compare only within the same lab/assay. No universal diagnostic cutoff. HOMA1, not HOMA2.",
    validation: "Require explicit fasting, exogenous-insulin and eligible-population answers. Positive finite glucose and insulin; block overflow/underflow. These are numeric sanity guards, not validated clinical min/max ranges. No diagnostic categories or cutoffs are applied.",
    conversion: "Insulin pmol/L ÷ 6.0 = mU/L (= µU/mL), per Doc’s human-insulin standard decision. Do not use the legacy ÷6.945 factor. The exact numeric recommendation in Knopp full text was inaccessible; this evidence limitation is disclosed in the tracked addendum.",
    method: "HOMA1-IR = fasting glucose (mmol/L) × fasting insulin (mU/L) / 22.5. Canadian insulin conversion pmol/L ÷ 6.0. No HOMA2 approximation, HOMA-B or QUICKI output. Display IR to 2 decimals, converted insulin to 1 decimal; internal precision retained.",
    clinicalReview: review,
    sources: [pubmed2("Matthews et al., Diabetologia 1985", "3899825"), pubmed2("Knopp et al., insulin units, 2019 (abstract; numeric recommendation full text not retrieved)", "30318910"), pubmed2("Wallace et al., Use and abuse of HOMA modeling, 2004", "15161807")],
    inputs: [number2("glucose", "Fasting glucose", "mmol/L", "Positive finite value. No unsourced universal cutoff or diagnostic interpretation."), number2("insulin", "Fasting insulin", "pmol/L", "Canadian laboratory unit. Converted internally by dividing by 6.0; do not enter mU/L."), yesno2("fasting", "Overnight fast ≥8 hours, water only?", "No blocks HOMA1."), yesno2("exogenous", "Using exogenous insulin?", "Yes blocks HOMA1. Assays may cross-react with insulin analogues."), yesno2("population", "Non-diabetic or early untreated dysglycaemia?", "No blocks this tool: established beta-cell failure and glucose-lowering treatment distort estimates.")],
    outputs: [{ key: "ir", label: "HOMA1-IR", unit: "index (unitless)", decimals: 2 }, { key: "insulinMu", label: "Converted fasting insulin", unit: "mU/L", decimals: 1 }],
    calculate: homa,
    interpretation: () => "No universal diagnostic cutoff; assay- and population-dependent. HOMA1, not HOMA2. No diagnosis inferred.",
    vectors: [{ inputs: homaInputs, expected: { ir: "4.90", insulinMu: "19.0" }, provenance: "Doc §3.9 V1, independently derived Matthews formula" }, { inputs: { ...homaInputs, glucose: "5", insulin: "60" }, expected: { ir: "2.22" }, provenance: "Doc §3.9 V2" }]
  },
  {
    id: "egfr-2021",
    name: "eGFR CKD-EPI 2021",
    category: "Renal",
    aliases: ["kidney", "creatinine", "GFR"],
    version: "Inker 2021 — creatinine-only, race-free CKD-EPI",
    endpoint: "Estimated glomerular filtration rate indexed to 1.73 m² body surface area.",
    applicability: "Adults only; stable creatinine, not acute kidney injury. Not supported here at extremes of muscle mass/body habitus. Creatinine–cystatin C is more accurate. Indexed eGFR is not Cockcroft–Gault CrCl or absolute drug-dosing clearance; no CKD diagnosis or staging from a single result.",
    validation: "Adult model lower age 18 years. Completed whole-year ages ≤120 are accepted; 120 is an engineering sanity ceiling, NOT a validated upper age. Positive finite creatinine is a numeric guard, not a validated concentration range. Explicit stable-creatinine and habitus answers required; no race factor.",
    conversion: "Serum creatinine µmol/L ÷ 88.4 = mg/dL.",
    method: "eGFR = 142 × min(Scr/κ,1)^α × max(Scr/κ,1)^−1.200 × 0.9938^Age × (1.012 if female). Scr in mg/dL; κ=.7 female/.9 male; α=−.241 female/−.302 male. No race coefficient. Whole-number display only, full precision internally.",
    clinicalReview: review,
    sources: [pubmed2("Inker et al., NEJM 2021", "34554658"), source2("NIDDK GFR equations and limitations", "https://www.niddk.nih.gov/health-information/professionals/clinical-tools-patient-management/kidney-disease/laboratory-evaluation/glomerular-filtration-rate/estimating")],
    inputs: [sex, age3, number2("creatinine", "Serum creatinine", "µmol/L", "Positive finite serum creatinine; internally divided by 88.4."), yesno2("stable", "Stable creatinine, without acute kidney injury?", "No blocks creatinine-based estimation."), yesno2("habit", "Extremes of muscle mass or body habitus?", "Yes blocks this tool; creatinine-only estimation may be inappropriate.")],
    outputs: [{ key: "gfr", label: "eGFR", unit: "mL/min/1.73 m²", decimals: 0 }],
    calculate: egfr,
    interpretation: () => "Estimate, not a precise measurement. Creatinine–cystatin C is more accurate; indexed eGFR is not absolute drug-dosing clearance.",
    vectors: [{ inputs: egfrInputs, expected: { gfr: "75" }, provenance: "Doc §4 independent F55/Scr80" }, { inputs: { ...egfrInputs, sex: "male", age: "60", creatinine: "110" }, expected: { gfr: "66" }, provenance: "Doc §4 independent M60/Scr110" }, { inputs: { ...egfrInputs, age: "70", creatinine: "120" }, expected: { gfr: "42" }, provenance: "Doc §4 independent F70/Scr120" }]
  },
  ...expansion
];
function favourites(value) {
  if (!Array.isArray(value) || !value.every((x) => typeof x === "string")) return [];
  return [...new Set(value)].filter((id) => registry.some((d) => d.id === id));
}
function summary(d, result) {
  return [d.name, d.version, d.endpoint, ...d.outputs.filter((o) => result[o.key] !== null && result[o.key] !== void 0).map((o) => `${o.label}: ${result[o.key].toFixed(o.decimals)} ${o.unit}`), d.interpretation(result), d.applicability, "Clinician decision support; verify applicability."].join("\n");
}

// src/catalog-view.js
var BATCH_SIZE = 24;
function filterCatalog(catalog, { query = "", category = "all", onlyFavourites = false, favouriteIds = [], letter = "all", az = false } = {}) {
  const q = query.trim().toLowerCase();
  const rows = catalog.filter((d) => (category === "all" || d.category === category) && (!onlyFavourites || favouriteIds.includes(d.id)) && (letter === "all" || d.name.toUpperCase().startsWith(letter)) && (!q || [d.name, d.category, ...d.aliases].some((s) => s.toLowerCase().includes(q))));
  return az ? rows.sort((a, b) => a.name.localeCompare(b.name, "en")) : rows;
}
function catalogPage(catalog, filters, limit = BATCH_SIZE) {
  const matches = filterCatalog(catalog, filters);
  return { matches, shown: matches.slice(0, limit) };
}

// src/state.js
function initial(d, revision = 0) {
  return { id: d.id, revision, draft: Object.fromEntries(d.inputs.map((f) => [f.id, ""])), snapshot: null, errors: {}, status: "" };
}
function currentSnapshot(d, s) {
  const r = s?.snapshot;
  return r && s.id === d.id && r.id === d.id && r.version === d.version && r.revision === s.revision ? r : null;
}
function transition(d, s, action) {
  if (s.id !== d.id) throw new Error("Calculator state mismatch");
  if (action.type === "reset") return initial(d, s.revision + 1);
  if (action.type === "edit") return { ...s, revision: s.revision + 1, draft: { ...s.draft, [action.field]: action.value }, snapshot: null, errors: {}, status: s.snapshot || s.status ? "Inputs changed — calculate again" : "" };
  if (action.type === "calculate") {
    try {
      const result = Object.freeze(d.calculate(s.draft));
      const inputs = Object.freeze(Object.fromEntries(d.inputs.map((f) => [f.id, f.type === "number" ? s.draft[f.id] === "" && f.optional ? null : Number(s.draft[f.id]) : s.draft[f.id]])));
      const snapshot = Object.freeze({ id: d.id, version: d.version, revision: s.revision, inputs, result });
      return { ...s, snapshot, errors: {}, status: "Result ready" };
    } catch (error) {
      return { ...s, snapshot: null, errors: error instanceof InputError ? { [error.field]: error.message } : {}, status: error instanceof InputError ? "Check the highlighted fields" : "Unable to calculate this result; inputs were not saved" };
    }
  }
  return s;
}

// src/ui-groups.js
var inputGroups = {
  framingham: [["Model and age", ["sex", "age"]], ["Measurements", ["tc", "hdl", "sbp"]], ["Risk factors", ["treated", "smoker", "diabetes"]], ["Eligibility checks", ["cvd", "genetic", "bypass"]], ["Canadian reporting input", ["family"]]],
  "homa1-ir": [["Measurements", ["glucose", "insulin"]], ["Eligibility", ["fasting", "exogenous", "population"]]],
  "egfr-2021": [["Model and measurements", ["sex", "age", "creatinine"]], ["Applicability", ["stable", "habit"]]],
  bmi: [["Measurements and age", ["weight", "height", "age"]], ["Classification applicability", ["pregnantOrLactating"]]],
  "bsa-mosteller": [["Measurements", ["height", "weight"]]],
  apri: [["Laboratory inputs", ["ast", "uln", "platelets"]], ["Applicability", ["acute"]]],
  "anion-gap": [["Electrolytes", ["sodium", "chloride", "bicarbonate"]], ["Potassium convention", ["convention", "potassium"]], ["Optional albumin correction", ["albumin", "reference"]]],
  "corrected-sodium": [["Measurements", ["sodium", "glucose"]], ["Method selection", ["formula"]]],
  qtc: [["Measurements", ["qt", "hr"]], ["Method selection", ["formula"]]],
  "homa1-b": [["Measurements", ["glucose", "insulin"]], ["Eligibility", ["fasting", "exogenous", "population"]]],
  quicki: [["Measurements", ["glucose", "insulin"]], ["Eligibility", ["fasting", "exogenous", "population"]]],
  "cha2ds2-vasc": [["AF/model context", ["af", "ageBand", "sex"]], ["Risk factors", ["chf", "hypertension", "diabetes", "stroke", "vascular"]]],
  "has-bled": [["AF and age", ["af", "age"]], ["Clinical factors", ["hypertension", "renal", "liver", "stroke", "bleeding"]], ["Anticoagulant and INR", ["anticoagulant", "labile"]], ["Medicines and alcohol", ["drugs", "alcohol"]]],
  fib4: [["Laboratory and age", ["age", "ast", "alt", "platelets"]]],
  "cockcroft-gault": [["Model and age", ["age", "sex"]], ["Measurements", ["weight", "creatinine"]]]
};

// src/precision-theme.js
var css = `
.cpc{--cpc-outer:#dce5e6;--cpc-paper:#f6faf9;--cpc-field:#fff;--cpc-ink:#102e38;--cpc-muted:#3f5960;--cpc-rule:#acbfc2;--cpc-control:#657f86;--cpc-accent:#085a72;--cpc-onaccent:#fff;--cpc-soft:#dceff1;--cpc-focus:#ad410c;--cpc-warn:#edf1e6;--cpc-warnrule:#8ca47a;
 container-type:inline-size;box-sizing:border-box;width:100%;min-width:0;padding:16px;background:var(--cpc-outer);color:var(--cpc-ink);font:1rem/1.5 Arial,Helvetica,sans-serif;overflow-wrap:anywhere;color-scheme:light}
:where(html[data-hermes-mode=dark],html:not([data-hermes-mode]).dark,html:not([data-hermes-mode]) body.dark) .cpc{--cpc-outer:#101d23;--cpc-paper:#172a31;--cpc-field:#1c343d;--cpc-ink:#ebf7f7;--cpc-muted:#bdd1d3;--cpc-rule:#4d6e74;--cpc-control:#76979e;--cpc-accent:#8bd9e5;--cpc-onaccent:#092a31;--cpc-soft:#27454e;--cpc-focus:#ffb273;--cpc-warn:#28382e;--cpc-warnrule:#849f7c;color-scheme:dark}
.cpc *{box-sizing:border-box}.cpc [hidden]{display:none!important}.cpc h1,.cpc h2,.cpc h3,.cpc p{margin:0}.cpc h1{font-size:1.25rem;letter-spacing:-.025em;font-weight:600}.cpc h2{font-size:1.15rem;line-height:1.3;font-weight:600}.cpc h3{font-size:1rem;font-weight:600;margin:12px 0 8px}.cpc p{margin:8px 0}.cpc .cpc-muted,.cpc .cpc-help{color:var(--cpc-muted)}
.cpc>header{padding:12px 16px;background:var(--cpc-soft);border:1px solid var(--cpc-rule);border-radius:8px 8px 0 0}.cpc>header .cpc-muted{font-size:.875rem;margin:4px 0}.cpc>header .cpc-help{font-size:.875rem;max-width:110ch;margin:4px 0}
.cpc-layout{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;background:var(--cpc-paper);border:1px solid var(--cpc-rule);border-top:0;padding:16px;border-radius:0 0 8px 8px}.cpc-library,.cpc-work{min-width:0}.cpc-work{max-width:930px;container-type:inline-size;container-name:work}.cpc-work>h2{font-size:1.5rem;letter-spacing:-.02em}.cpc-work>.cpc-muted{font-size:.875rem}.cpc-empty{border-top:1px solid var(--cpc-rule);padding-top:16px}.cpc-workbody{margin-top:16px}.cpc-form-area{min-width:0;container-type:inline-size;container-name:inputs}.cpc-output-area{min-width:0}.cpc-workbody:not(:has(.cpc-result)){max-width:720px}
.cpc label{display:block;font-weight:600;margin:12px 0 5px}.cpc input,.cpc select{width:100%;min-width:0;min-height:44px;height:auto;padding:9px;border:1px solid var(--cpc-control);border-radius:8px;background:var(--cpc-field);color:var(--cpc-ink);font:inherit}.cpc input::placeholder{color:var(--cpc-muted);opacity:1}
.cpc button{min-height:44px;min-width:44px;max-width:100%;height:auto;padding:8px 12px;white-space:normal;text-align:left;border:1px solid var(--cpc-rule);border-radius:8px;background:var(--cpc-paper);color:var(--cpc-ink);font:inherit;cursor:pointer;overflow-wrap:anywhere;box-shadow:none}.cpc button:disabled{opacity:.65;cursor:default}.cpc button:hover:not(:disabled){background:var(--cpc-soft)}
.cpc :is(button,input,select,a,summary):focus-visible{outline:3px solid var(--cpc-focus);outline-offset:2px}.cpc [aria-current=true]{box-shadow:inset 3px 0 var(--cpc-accent);font-weight:600;background:var(--cpc-soft)}.cpc [aria-pressed=true]{border-color:var(--cpc-accent);background:var(--cpc-soft);font-weight:600;text-decoration:underline;text-underline-offset:3px}.cpc-actions{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.cpc-actions:empty{display:none}.cpc button.cpc-primary{font-weight:600;border:1px solid var(--cpc-accent);background:var(--cpc-accent);color:var(--cpc-onaccent)}.cpc button.cpc-primary:hover:not(:disabled){background:var(--cpc-accent);text-decoration:underline}
.cpc-command{padding-bottom:8px;border-bottom:1px solid var(--cpc-rule)}.cpc-command>label{margin-top:0}.cpc-filters{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.cpc-filters select{flex:1 1 12rem;width:auto}.cpc-filters button{flex:0 1 auto}.cpc #cpc-count{margin-bottom:0;font-variant-numeric:tabular-nums}.cpc-catalog-rows>section>h2{font-size:.875rem;color:var(--cpc-muted);margin:20px 0 4px;padding-bottom:6px;border-bottom:1px solid var(--cpc-rule)}.cpc-row{display:grid;grid-template-columns:minmax(0,1fr) 44px;align-items:start;gap:4px;border-bottom:1px solid var(--cpc-rule);padding:4px 0}.cpc-row button[data-testid]{border:0;border-radius:0;display:block;width:100%;padding:8px;font-size:.9375rem}.cpc-row>button:last-child{padding:8px;border-color:transparent}.cpc-row small{display:block;font-size:.875rem;font-weight:400;color:var(--cpc-muted);margin-top:2px}.cpc-name{font-weight:600}
.cpc-help{font-size:.875rem;margin:4px 0 12px}.cpc-error{border-left:3px solid var(--cpc-focus);padding-left:8px;margin-top:5px}.cpc fieldset{border:0;padding:0;margin:0;min-width:0}.cpc legend{font-weight:600;margin:12px 0 4px}.cpc fieldset.cpc-input-group{border-top:1px solid var(--cpc-rule);margin-top:12px;padding-top:4px}.cpc fieldset.cpc-input-group:first-child{margin-top:0}.cpc-fields{display:grid;grid-template-columns:minmax(0,1fr);gap:0 20px}.cpc-wide{grid-column:1/-1}.cpc-selected-choice{font-size:.875rem;overflow-wrap:anywhere}
.cpc-result{border:1px solid var(--cpc-rule);padding:16px;margin-top:16px;background:var(--cpc-soft);border-radius:8px}.cpc-result h3{margin-top:0}.cpc-values{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;margin:12px 0}.cpc-values dt{color:var(--cpc-muted)}.cpc-values dd{font-size:1.75rem;font-weight:600;margin:0;font-variant-numeric:tabular-nums;line-height:1.3}.cpc-values dd span{font-size:1rem;font-weight:400}.cpc details{margin:20px 0;border-top:1px solid var(--cpc-rule);padding-top:12px}.cpc summary{min-height:44px;cursor:pointer;font-weight:600;padding:8px 0}.cpc a{color:var(--cpc-accent);text-decoration:underline}.cpc li{margin-bottom:10px}.cpc-status{min-height:1.5em}.cpc .cpc-selected-note{font-size:.875rem}.cpc .cpc-flag{border-left:3px solid var(--cpc-warnrule);padding:12px;background:var(--cpc-warn);border-radius:0 8px 8px 0}.cpc-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
@container inputs (min-width:30rem){.cpc-short-choice{display:none}.cpc-fields{grid-template-columns:repeat(2,minmax(0,1fr))}}
@container (min-width:44rem){.cpc:not(.cpc-active) .cpc-entries{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 16px}}
@container (min-width:760px){.cpc-active .cpc-layout{grid-template-columns:minmax(220px,260px) minmax(0,1fr)}.cpc-active .cpc-library{align-self:start;max-height:75dvh;overflow-y:auto;padding:4px;scrollbar-gutter:stable}}
@container work (min-width:50rem){.cpc-workbody:has(.cpc-result){display:grid;grid-template-columns:minmax(0,1fr) minmax(240px,.8fr);gap:24px}.cpc-result{margin-top:0}}
@container (max-width:420px){.cpc-layout{padding:12px}.cpc>header{padding:12px}.cpc-values dd{font-size:1.5rem}}
@media(prefers-reduced-motion:reduce){.cpc *{scroll-behavior:auto!important;transition:none!important;animation:none!important}}
`;

// src/plugin.jsx
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
function Calculator({ definition: d, ctx, active }) {
  const [view, setView] = useState(() => initial(d));
  const live = useRef(view);
  const mounted = useRef(true);
  const busy = useRef(false);
  const [copyStatus, setCopyStatus] = useState("");
  const form = useRef(null);
  const pendingErrorFocus = useRef(null);
  useLayoutEffect(() => {
    const field = pendingErrorFocus.current;
    pendingErrorFocus.current = null;
    if (field) {
      const control = form.current?.querySelector(`#cpc-${field}`);
      control?.focus({ preventScroll: true });
      control?.closest(".cpc-field")?.scrollIntoView({ block: "center", inline: "nearest" });
    }
  }, [view]);
  useLayoutEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      live.current = null;
    };
  }, []);
  function send(action) {
    if (!live.current || active.current !== d.id) return;
    const next = transition(d, live.current, action);
    live.current = next;
    pendingErrorFocus.current = action.type === "calculate" ? Object.keys(next.errors)[0] : null;
    setView(next);
    setCopyStatus("");
  }
  async function copy() {
    if (busy.current || !mounted.current || active.current !== d.id) return;
    const snapshot2 = currentSnapshot(d, live.current);
    if (!snapshot2) return;
    busy.current = true;
    setCopyStatus("Copying…");
    try {
      const ok = await ctx.os.writeClipboard(summary(d, snapshot2.result));
      if (mounted.current && active.current === d.id && currentSnapshot(d, live.current) === snapshot2) setCopyStatus(ok === true ? "Result copied" : "Could not copy. Select the result text to copy manually.");
    } catch {
      if (mounted.current && active.current === d.id && currentSnapshot(d, live.current) === snapshot2) setCopyStatus("Could not copy. Select the result text to copy manually.");
    } finally {
      busy.current = false;
    }
  }
  const snapshot = currentSnapshot(d, view);
  return /* @__PURE__ */ jsxs("section", { className: "cpc-work", "aria-labelledby": "cpc-selected-title", children: [
    /* @__PURE__ */ jsx("h2", { id: "cpc-selected-title", tabIndex: -1, children: d.name }),
    /* @__PURE__ */ jsx("p", { className: "cpc-muted", children: d.version }),
    /* @__PURE__ */ jsx("p", { children: d.endpoint }),
    /* @__PURE__ */ jsx("p", { className: "cpc-flag", children: d.applicability }),
    /* @__PURE__ */ jsxs("div", { className: "cpc-workbody", children: [
      /* @__PURE__ */ jsxs("div", { className: "cpc-form-area", children: [
        /* @__PURE__ */ jsxs("form", { ref: form, autoComplete: "off", noValidate: true, onSubmit: (event) => {
          event.preventDefault();
          send({ type: "calculate" });
        }, "aria-label": `${d.name} inputs`, children: [
          inputGroups[d.id].map(([title, ids]) => /* @__PURE__ */ jsxs("fieldset", { className: "cpc-input-group", children: [
            /* @__PURE__ */ jsx("legend", { children: title }),
            /* @__PURE__ */ jsx("div", { className: "cpc-fields", children: ids.map((id) => d.inputs.find((f) => f.id === id)).map((f) => /* @__PURE__ */ jsxs("div", { className: f.type === "choice" ? "cpc-field cpc-wide" : "cpc-field", children: [
              /* @__PURE__ */ jsxs("label", { htmlFor: `cpc-${f.id}`, children: [
                f.label,
                " (",
                f.unit,
                ")"
              ] }),
              f.type === "choice" ? /* @__PURE__ */ jsxs("select", { id: `cpc-${f.id}`, value: view.draft[f.id], autoComplete: "off", "aria-describedby": `cpc-${f.id}-help${view.errors[f.id] ? ` cpc-${f.id}-error` : ""}`, "aria-invalid": !!view.errors[f.id], onChange: (e) => send({ type: "edit", field: f.id, value: e.target.value }), children: [
                /* @__PURE__ */ jsx("option", { value: "", children: "Not selected" }),
                f.options.map((o) => /* @__PURE__ */ jsx("option", { value: o.value, children: o.label }, o.value))
              ] }) : /* @__PURE__ */ jsx(Input, { id: `cpc-${f.id}`, type: "text", inputMode: "decimal", autoComplete: "off", spellCheck: false, value: view.draft[f.id], "aria-invalid": !!view.errors[f.id], "aria-describedby": `cpc-${f.id}-help${view.errors[f.id] ? ` cpc-${f.id}-error` : ""}`, onChange: (e) => send({ type: "edit", field: f.id, value: e.target.value }) }),
              f.type === "choice" && view.draft[f.id] && /* @__PURE__ */ jsx("p", { id: `cpc-${f.id}-selected`, className: `cpc-selected-choice${f.options.find((o) => o.value === view.draft[f.id]).label.length <= 30 ? " cpc-short-choice" : ""}`, "aria-hidden": "true", children: f.options.find((o) => o.value === view.draft[f.id]).label }),
              /* @__PURE__ */ jsx("p", { id: `cpc-${f.id}-help`, className: "cpc-help", children: f.help }),
              view.errors[f.id] && /* @__PURE__ */ jsx("p", { id: `cpc-${f.id}-error`, className: "cpc-error", children: view.errors[f.id] })
            ] }, f.id)) })
          ] }, title)),
          /* @__PURE__ */ jsxs("div", { className: "cpc-actions", children: [
            /* @__PURE__ */ jsx(Button, { type: "submit", className: "cpc-primary", children: "Calculate" }),
            /* @__PURE__ */ jsx(Button, { type: "button", variant: "outline", onClick: () => send({ type: "reset" }), children: "Reset inputs" })
          ] })
        ] }),
        /* @__PURE__ */ jsx("p", { role: "status", "aria-live": "polite", className: snapshot ? "cpc-status cpc-sr-only" : "cpc-status", children: view.status })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "cpc-output-area", children: [
        snapshot && /* @__PURE__ */ jsxs("section", { className: "cpc-result", "aria-label": "Result", children: [
          /* @__PURE__ */ jsx("h3", { children: "Result" }),
          /* @__PURE__ */ jsx("dl", { className: "cpc-values", children: d.outputs.filter((o) => snapshot.result[o.key] !== null && snapshot.result[o.key] !== void 0).map((o) => /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("dt", { children: o.label }),
            /* @__PURE__ */ jsxs("dd", { children: [
              snapshot.result[o.key].toFixed(o.decimals),
              " ",
              /* @__PURE__ */ jsx("span", { children: o.unit })
            ] })
          ] }, o.key)) }),
          /* @__PURE__ */ jsx("p", { className: "cpc-muted", children: d.version }),
          /* @__PURE__ */ jsx("p", { children: d.endpoint }),
          /* @__PURE__ */ jsx("p", { children: d.interpretation(snapshot.result) }),
          /* @__PURE__ */ jsx("p", { className: "cpc-help", children: d.applicability }),
          /* @__PURE__ */ jsx(Button, { type: "button", variant: "outline", disabled: copyStatus === "Copying…", onClick: copy, children: "Copy result" }),
          /* @__PURE__ */ jsx("p", { className: "cpc-help", children: "Copy places this result on the system clipboard; it may remain there after you reset or leave Hermes. Clipboard content is not cleared by reset." })
        ] }),
        /* @__PURE__ */ jsx("p", { role: "status", "aria-live": "polite", children: copyStatus })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("details", { children: [
      /* @__PURE__ */ jsx("summary", { children: "Method, applicability & sources" }),
      /* @__PURE__ */ jsx("h3", { children: "Method & conversion" }),
      /* @__PURE__ */ jsx("p", { children: d.method }),
      /* @__PURE__ */ jsx("p", { children: d.conversion }),
      /* @__PURE__ */ jsx("h3", { children: "Applicability & input limits" }),
      /* @__PURE__ */ jsx("p", { children: d.applicability }),
      /* @__PURE__ */ jsx("p", { children: d.validation }),
      /* @__PURE__ */ jsx("h3", { children: "Clinical review status" }),
      /* @__PURE__ */ jsx("p", { children: d.clinicalReview }),
      /* @__PURE__ */ jsx("h3", { children: "Sources" }),
      /* @__PURE__ */ jsx("p", { className: "cpc-help", children: "Source links open online only when selected." }),
      /* @__PURE__ */ jsx("ul", { children: d.sources.map((s) => /* @__PURE__ */ jsxs("li", { children: [
        /* @__PURE__ */ jsxs("a", { href: s.url, target: "_blank", rel: "noopener noreferrer", children: [
          s.title,
          " — Opens online"
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "cpc-help", children: [
          "Accessed ",
          s.accessed
        ] })
      ] }, s.url)) })
    ] })
  ] });
}
function readFavourites(ctx) {
  try {
    const stored = ctx.storage.get("favourites.v1", []);
    const ids = favourites(stored);
    return { ids, warning: JSON.stringify(stored) === JSON.stringify(ids) ? "" : "Invalid favourite preferences were ignored." };
  } catch {
    return { ids: [], warning: "Could not read favourites; calculations remain available." };
  }
}
function Library({ ctx, catalog = registry }) {
  const [filters, setFilters] = useState({ query: "", category: "all", onlyFavourites: false, az: false, letter: "all" });
  const { query, category, onlyFavourites, az, letter } = filters;
  const [limit, setLimit] = useState(BATCH_SIZE);
  const [prefs, setPrefs] = useState(() => readFavourites(ctx));
  const [selected, setSelected] = useState(null);
  const active = useRef(null);
  const container = useRef(null);
  const [compact, setCompact] = useState(true);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const focusSelection = useRef(false);
  const reveal = useRef(null);
  useLayoutEffect(() => {
    const observer = new ResizeObserver((entries) => setCompact(entries[0].contentRect.width < 760));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);
  useLayoutEffect(() => {
    if (focusSelection.current) {
      document.getElementById("cpc-selected-title")?.focus();
      focusSelection.current = false;
    }
  }, [selected]);
  useLayoutEffect(() => {
    if (reveal.current) {
      container.current?.querySelector(`[data-testid="select-${reveal.current}"]`)?.focus();
      reveal.current = null;
    }
  }, [limit]);
  const { matches, shown } = catalogPage(catalog, { ...filters, favouriteIds: prefs.ids }, limit);
  const categories = [...new Set(catalog.map((d) => d.category))];
  const groups = az ? [null] : [...new Set(shown.map((d) => d.category))];
  function change(values) {
    setFilters((previous) => ({ ...previous, ...values }));
    setLimit(BATCH_SIZE);
  }
  function resetFilters() {
    setFilters({ query: "", category: "all", onlyFavourites: false, az: false, letter: "all" });
    setLimit(BATCH_SIZE);
  }
  function select2(d) {
    setLibraryOpen(false);
    if (active.current === d.id) {
      document.getElementById("cpc-selected-title")?.focus();
      return;
    }
    active.current = d.id;
    focusSelection.current = true;
    setSelected(d);
  }
  function toggle(id) {
    const ids = favourites(prefs.ids.includes(id) ? prefs.ids.filter((x) => x !== id) : [...prefs.ids, id]);
    try {
      ctx.storage.set("favourites.v1", ids);
      setPrefs({ ids, warning: "" });
      setLimit(BATCH_SIZE);
    } catch {
      setPrefs({ ...prefs, warning: "Could not save favourites; previous preferences retained." });
    }
  }
  return /* @__PURE__ */ jsxs("main", { className: `cpc${selected ? " cpc-active" : ""}`, ref: container, children: [
    /* @__PURE__ */ jsx("style", { children: css }),
    /* @__PURE__ */ jsxs("header", { children: [
      /* @__PURE__ */ jsx("h1", { children: "Canadian Primary Care" }),
      /* @__PURE__ */ jsx("p", { className: "cpc-muted", children: "Local, on-device calculations · clinical inputs not saved" }),
      /* @__PURE__ */ jsx("p", { className: "cpc-help", children: "No patient identifiers. Not a diagnosis. Clinician decision support — verify applicability and consult the model references. Release review evidence is recorded in the project documentation." })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "cpc-layout", children: [
      /* @__PURE__ */ jsxs("aside", { className: "cpc-library", "aria-label": "Calculator library", children: [
        compact && selected && /* @__PURE__ */ jsxs(Button, { type: "button", variant: "outline", "aria-expanded": libraryOpen, "aria-controls": "cpc-catalog", onClick: () => setLibraryOpen((open) => !open), children: [
          "Change calculator · ",
          selected.name,
          " · ",
          selected.inputs.length,
          " inputs"
        ] }),
        /* @__PURE__ */ jsxs("div", { id: "cpc-catalog", hidden: compact && !!selected && !libraryOpen, children: [
          /* @__PURE__ */ jsxs("div", { className: "cpc-command", children: [
            /* @__PURE__ */ jsx("label", { htmlFor: "cpc-search", children: "Search calculators" }),
            /* @__PURE__ */ jsx(Input, { id: "cpc-search", type: "search", autoComplete: "off", value: query, placeholder: "Name, alias or category", onChange: (e) => change({ query: e.target.value }) }),
            /* @__PURE__ */ jsxs("div", { className: "cpc-filters", children: [
              /* @__PURE__ */ jsxs("select", { "aria-label": "Filter by clinical category", value: category, onChange: (e) => change({ category: e.target.value }), children: [
                /* @__PURE__ */ jsx("option", { value: "all", children: "All categories" }),
                categories.map((c) => /* @__PURE__ */ jsx("option", { value: c, children: c }, c))
              ] }),
              /* @__PURE__ */ jsx(Button, { type: "button", variant: "outline", "aria-pressed": onlyFavourites, onClick: () => change({ onlyFavourites: !onlyFavourites }), children: onlyFavourites ? "Show all calculators" : "Show favourites" }),
              /* @__PURE__ */ jsx(Button, { type: "button", variant: "outline", "aria-pressed": az, onClick: () => change({ az: !az }), children: "Sort A–Z" }),
              /* @__PURE__ */ jsxs("select", { "aria-label": "Browse first letter", value: letter, onChange: (e) => change({ letter: e.target.value, az: e.target.value !== "all" || az }), children: [
                /* @__PURE__ */ jsx("option", { value: "all", children: "Any letter" }),
                "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((c) => /* @__PURE__ */ jsx("option", { value: c, children: c }, c))
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "cpc-actions", children: [
              query && /* @__PURE__ */ jsx(Button, { type: "button", variant: "outline", onClick: () => change({ query: "" }), children: "Clear search" }),
              (query || category !== "all" || onlyFavourites || az || letter !== "all") && /* @__PURE__ */ jsx(Button, { type: "button", variant: "outline", onClick: resetFilters, children: "Reset filters" })
            ] }),
            /* @__PURE__ */ jsxs("p", { className: "cpc-help", id: "cpc-count", role: "status", children: [
              "Showing ",
              shown.length,
              " of ",
              matches.length,
              " ",
              matches.length === 1 ? "calculator" : "calculators"
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "cpc-catalog-rows", children: groups.map((group) => /* @__PURE__ */ jsxs("section", { "aria-label": group ?? "Alphabetical calculators", children: [
            group && /* @__PURE__ */ jsx("h2", { children: group }),
            /* @__PURE__ */ jsx("div", { className: "cpc-entries", children: shown.filter((d) => !group || d.category === group).map((d) => /* @__PURE__ */ jsxs("div", { className: "cpc-row", children: [
              /* @__PURE__ */ jsxs(Button, { type: "button", variant: "outline", "data-testid": `select-${d.id}`, "aria-current": selected?.id === d.id ? "true" : void 0, onClick: () => select2(d), children: [
                /* @__PURE__ */ jsx("span", { className: "cpc-name", children: d.name }),
                selected?.id === d.id ? " — Selected" : "",
                /* @__PURE__ */ jsx("small", { children: d.version })
              ] }),
              /* @__PURE__ */ jsx(Button, { type: "button", variant: "outline", "aria-label": `${prefs.ids.includes(d.id) ? "Remove from" : "Add to"} favourites: ${d.name}`, "aria-pressed": prefs.ids.includes(d.id), onClick: () => toggle(d.id), children: prefs.ids.includes(d.id) ? "★" : "☆" })
            ] }, d.id)) })
          ] }, group ?? "az")) }),
          shown.length < matches.length && /* @__PURE__ */ jsx(Button, { type: "button", variant: "outline", onClick: () => {
            reveal.current = matches[shown.length].id;
            setLimit((previous) => previous + BATCH_SIZE);
          }, children: "Show more calculators" }),
          !matches.length && /* @__PURE__ */ jsx("p", { children: onlyFavourites && !prefs.ids.length ? "No favourites yet" : query || category !== "all" || letter !== "all" ? "No calculators match these filters." : "No calculators available." }),
          prefs.warning && /* @__PURE__ */ jsx("p", { role: "status", children: prefs.warning }),
          selected && /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsxs("p", { className: "cpc-selected-note", children: [
              "Working on: ",
              selected.name
            ] }),
            /* @__PURE__ */ jsx(Button, { type: "button", variant: "outline", onClick: () => {
              setLibraryOpen(false);
              document.getElementById("cpc-selected-title")?.focus();
            }, children: "Jump to calculator" })
          ] })
        ] })
      ] }),
      selected ? /* @__PURE__ */ jsx(Calculator, { definition: selected, ctx, active }, selected.id) : /* @__PURE__ */ jsxs("section", { className: "cpc-work cpc-empty", children: [
        /* @__PURE__ */ jsx("h2", { children: "Select a calculator to begin" }),
        /* @__PURE__ */ jsx("p", { children: "Choose a model from the library. Inputs start blank and are cleared when switching calculators or leaving this page." })
      ] })
    ] })
  ] });
}
var plugin_default = {
  id: "canadian-primary-care",
  name: "Canadian Primary Care",
  defaultEnabled: false,
  register(ctx) {
    ctx.register({ id: "page", area: ROUTES_AREA, data: { path: "/canadian-primary-care" }, render: () => /* @__PURE__ */ jsx(Library, { ctx }) });
    ctx.register({ id: "nav", area: SIDEBAR_NAV_AREA, order: 63, data: { path: "/canadian-primary-care", label: "Canadian Primary Care", codicon: "symbol-method" } });
    ctx.register({ id: "open", area: PALETTE_AREA, data: { id: "canadian-primary-care.open", label: "Open Canadian Primary Care", keywords: ["calculators", "Canadian", "primary care"], run: () => host.navigate("/canadian-primary-care") } });
  }
};
export {
  Library,
  plugin_default as default
};
