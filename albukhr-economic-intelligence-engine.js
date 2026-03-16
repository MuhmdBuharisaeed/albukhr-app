/* =========================================
   ALBUKHR ECONOMIC INTELLIGENCE ENGINE
   Decision Intelligence for Ecosystem
========================================= */

function getEconomicMetrics(project){

const treasury =
getProjectTreasuryStatus(project);

const stakes =
typeof getAllStakesMerged === "function"
? getAllStakesMerged().filter(s => s.project === project)
: [];

const investors = stakes.length;

let totalStake = 0;

stakes.forEach(s=>{
totalStake += Number(s.amount) || 0;
});

const roi =
typeof calculateProjectROI === "function"
? calculateProjectROI(project)
: 0;

const risk =
typeof getProjectRisk === "function"
? getProjectRisk(project)
: {risk:"HIGH",score:0};

const liquidity =
treasury.liquidity || 0;

/* LIQUIDITY NEED */

let liquidityNeed = 0;

if(liquidity < 500) liquidityNeed += 40;
if(investors > 10) liquidityNeed += 30;
if(totalStake > liquidity) liquidityNeed += 30;

/* PROFIT SCORE */

let profitScore = 0;

profitScore += roi * 2;
profitScore += investors * 3;

/* FINAL */

return {

project,
liquidity,
investors,
roi,
risk:risk.risk,
riskScore:risk.score,

liquidityNeed,
profitScore

};

}

/* =========================================
   COLLECT ALL PROJECT INTELLIGENCE
========================================= */

function getEconomicIntelligence(){

const projects =
typeof getProjects === "function"
? getProjects()
: [];

const list = [];

projects.forEach(p => {

const metrics =
getEconomicMetrics(p.name);

list.push(metrics);

});

return list;

}

/* =========================================
   PROJECTS THAT NEED LIQUIDITY
========================================= */

function getLiquidityPriority(limit=5){

const data = getEconomicIntelligence();

return data
.sort((a,b)=> b.liquidityNeed - a.liquidityNeed)
.slice(0,limit);

}

/* =========================================
   MOST PROFITABLE PROJECTS
========================================= */

function getTopProfitProjects(limit=5){

const data = getEconomicIntelligence();

return data
.sort((a,b)=> b.profitScore - a.profitScore)
.slice(0,limit);

}

/* =========================================
   RISK PROJECTS
========================================= */

function getHighRiskProjects(limit=5){

const data = getEconomicIntelligence();

return data
.filter(p => p.risk === "HIGH")
.slice(0,limit);

}
