/* =========================================
   ALBUKHR RISK ENGINE v1
========================================= */

function calculateProjectRisk(project){

let score = 0;

/* ROI RISK */

const roi = Number(project.roi || 0);

if(roi <= 10) score += 1;
else if(roi <= 20) score += 2;
else score += 3;

/* LIQUIDITY RISK */

const liquidity = Number(project.initialLiquidity || 0);

if(liquidity >= 1000) score += 1;
else if(liquidity >= 200) score += 2;
else score += 3;

/* STAGE RISK */

switch(project.stage){

case "Scaling":
score += 1;
break;

case "Active":
score += 2;
break;

case "Pilot":
score += 3;
break;

case "Concept":
score += 4;
break;

default:
score += 2;

}

/* DECLARED RISK */

switch(project.risk){

case "Low":
score += 1;
break;

case "Medium":
score += 2;
break;

case "High":
score += 3;
break;

}

/* FINAL RESULT */

if(score <= 5){
return {score, risk:"LOW"};
}

if(score <= 8){
return {score, risk:"MEDIUM"};
}

return {score, risk:"HIGH"};

}
