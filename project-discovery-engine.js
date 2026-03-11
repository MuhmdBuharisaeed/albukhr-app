/* =========================================
   ALBUKHR PROJECT DISCOVERY ENGINE v1
   Ranks & highlights marketplace projects
========================================= */

function getProjectDiscoveryScore(project){

if(typeof getProjectRisk !== "function") return 0;
if(typeof getProjectTreasuryStatus !== "function") return 0;

const treasury = getProjectTreasuryStatus(project.name);
const liquidity = treasury.liquidity || 0;

const investors =
typeof getAllStakesMerged === "function"
? getAllStakesMerged().filter(s => s.project === project.name).length
: 0;

const roi = project.roi || 0;

const risk =
getProjectRisk(project.name)?.score || 0;

/* ===== SCORING ===== */

const liquidityScore = Math.min(liquidity / 10, 100);
const investorScore = Math.min(investors * 5, 100);
const roiScore = roi * 2;

/* ===== FINAL SCORE ===== */

const score =
(liquidityScore * 0.35) +
(investorScore * 0.25) +
(roiScore * 0.20) +
(risk * 0.20);

return score;

}

/* =========================================
   TRENDING PROJECTS
========================================= */

function getTrendingProjects(projects){

return projects
.map(p => ({
...p,
discoveryScore: getProjectDiscoveryScore(p)
}))
.sort((a,b)=>b.discoveryScore - a.discoveryScore)
.slice(0,3);

}

/* =========================================
   FEATURED PROJECTS
========================================= */

function getFeaturedProjects(projects){

return projects.filter(p => {

const liquidity =
getProjectTreasuryStatus(p.name).liquidity || 0;

return liquidity > 300;

});

}

/* =========================================
   SMART SORT
========================================= */

function sortByDiscovery(projects){

return projects
.map(p => ({
...p,
discoveryScore: getProjectDiscoveryScore(p)
}))
.sort((a,b)=>b.discoveryScore - a.discoveryScore);

}
