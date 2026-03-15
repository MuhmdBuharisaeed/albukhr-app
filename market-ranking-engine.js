/* =========================================
   ALBUKHR MARKET RANKING ENGINE v1
   Ranks projects by ROI, liquidity, risk
========================================= */

function getAllProjects(){

if(typeof getProjects !== "function")
return [];

return getProjects();

}


/* =========================================
   PROJECT METRICS
========================================= */

function getProjectMetrics(project){

const stakes =
typeof getAllStakesMerged === "function"
? getAllStakesMerged().filter(s => s.project === project)
: [];

const stakes =
getAllStakesMerged()
.filter(s => s.project === project);

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
: {score:0,risk:"HIGH"};

return {

project,

liquidity: treasury.liquidity,

stake: totalStake,

roi,

investors: stakes.length,

riskScore: risk.score,

riskLevel: risk.risk

};

}


/* =========================================
   COLLECT ALL METRICS
========================================= */

function getMarketMetrics(){

const projects = getAllProjects();

const list = [];

projects.forEach(p => {

const metrics =
getProjectMetrics(p.name);

list.push(metrics);

});

return list;

}


/* =========================================
   TOP ROI
========================================= */

function getTopROIProjects(limit = 5){

const list = getMarketMetrics();

return list
.sort((a,b)=> b.roi - a.roi)
.slice(0,limit);

}


/* =========================================
   SAFEST PROJECTS
========================================= */

function getSafestProjects(limit = 5){

const list = getMarketMetrics();

return list
.sort((a,b)=> b.riskScore - a.riskScore)
.slice(0,limit);

}


/* =========================================
   HIGHEST LIQUIDITY
========================================= */

function getHighestLiquidityProjects(limit = 5){

const list = getMarketMetrics();

return list
.sort((a,b)=> b.liquidity - a.liquidity)
.slice(0,limit);

}


/* =========================================
   MOST INVESTORS
========================================= */

function getMostInvestedProjects(limit = 5){

const list = getMarketMetrics();

return list
.sort((a,b)=> b.investors - a.investors)
.slice(0,limit);

}
