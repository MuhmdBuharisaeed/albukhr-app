/* ======================================
ALBUKHR PROJECT INTELLIGENCE ENGINE
====================================== */

function analyzeProject(project){

let score = 100;

/* ROI RISK */

let roiRisk = "SAFE";

if(project.roi > 35){
roiRisk = "HIGH";
score -= 30;
}
else if(project.roi > 25){
roiRisk = "MEDIUM";
score -= 15;
}

/* LIQUIDITY SAFETY */

let liquiditySafety = 0;

if(project.initialLiquidity && project.target){

liquiditySafety =
Math.min(
(project.initialLiquidity / project.target) * 100,
100
);

}else{

liquiditySafety = 50;

}

/* SUSTAINABILITY */

let sustainability = score;

if(liquiditySafety < 20){
sustainability -= 20;
}

let risk = "LOW";

if(sustainability < 50) risk = "HIGH";
else if(sustainability < 70) risk = "MEDIUM";

return {

risk: risk,

roiPressure: roiRisk,

liquiditySafety: liquiditySafety.toFixed(0),

score: sustainability

};

}
