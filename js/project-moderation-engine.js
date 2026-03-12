/* =========================================
   ALBUKHR PROJECT MODERATION ENGINE
   Evaluates project safety before approval
========================================= */

function evaluateProject(project){

let roiScore = 100;
let liquidityScore = 100;
let finalRisk = "LOW";

/* ROI CHECK */

if(project.roi > 50){
roiScore = 40;
}
else if(project.roi > 30){
roiScore = 60;
}
else if(project.roi > 20){
roiScore = 80;
}

/* LIQUIDITY CHECK */

if(project.liquidity < 100){
liquidityScore = 40;
}
else if(project.liquidity < 300){
liquidityScore = 70;
}
else{
liquidityScore = 100;
}

/* FINAL SCORE */

const score =
(roiScore * 0.5) +
(liquidityScore * 0.5);

if(score < 50){
finalRisk = "HIGH";
}
else if(score < 75){
finalRisk = "MEDIUM";
}

return{
score:score,
risk:finalRisk,
roiScore,
liquidityScore
};

}
