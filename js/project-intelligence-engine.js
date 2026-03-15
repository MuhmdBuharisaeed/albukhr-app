/* ======================================
ALBUKHR PROJECT INTELLIGENCE ENGINE v2
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


/* TRENDING SCORE */

let investors = 0;

if(typeof getAllStakesMerged === "function"){
investors =
getAllStakesMerged()
.filter(s => s.project === project.name).length;
}

let trendingScore =
investors * 3 +
liquiditySafety * 0.5 +
(project.roi || 0);


/* INVESTMENT SCORE */

let investmentScore =
sustainability +
liquiditySafety;

return {

risk: risk,

roiPressure: roiRisk,

liquiditySafety: liquiditySafety.toFixed(0),

score: sustainability,

trendingScore: trendingScore,

investmentScore: investmentScore

};

}
