/* =========================================
   ALBUKHR RISK ENGINE v1
   Calculates project safety & sustainability
========================================= */

function getProjectRisk(project){

if(typeof getProjectTreasuryStatus !== "function")
return null;

if(typeof getAllStakesMerged !== "function")
return null;

const treasury =
getProjectTreasuryStatus(project);

const stakes =
getAllStakesMerged()
.filter(s => s.project === project);

let totalStake = 0;

stakes.forEach(s=>{
totalStake += Number(s.amount) || 0;
});

const liquidity = treasury.liquidity;

let liquidityScore = 0;

if(totalStake === 0){
liquidityScore = 100;
}else{
liquidityScore = Math.min(
(liquidity / totalStake) * 100,
100
);
}


/* ROI PRESSURE */

let roi = 0;

if(typeof calculateProjectROI === "function"){
roi = calculateProjectROI(project);
}

let roiScore = 100;

if(roi > 50) roiScore = 40;
else if(roi > 30) roiScore = 60;
else if(roi > 20) roiScore = 80;


/* INVESTOR DISTRIBUTION */

const investorCount = stakes.length;

let investorScore = 50;

if(investorCount > 50) investorScore = 100;
else if(investorCount > 20) investorScore = 80;
else if(investorCount > 10) investorScore = 60;


/* FINAL SCORE */

const score =
(liquidityScore * 0.4) +
(roiScore * 0.3) +
(investorScore * 0.3);


let level = "HIGH";

if(score >= 80) level = "LOW";
else if(score >= 50) level = "MEDIUM";

return {
score: score,
risk: level,
liquidityScore,
roiScore,
investorScore
};

}
