/* =========================================
   ALBUKHR CORE LIQUIDITY ENGINE v1
   Auto Treasury Initialization for Core Projects
========================================= */

const CORE_LIQUIDITY_KEY = "albukhr_core_liquidity_initialized";

/* =========================================
   INIT CORE PROJECT TREASURIES
========================================= */

function initCoreProjectLiquidity(){

/* FORCE RESET */
if(localStorage.getItem(CORE_LIQUIDITY_KEY)) return;

if(typeof getMarketplaceProjects !== "function") return;

if(typeof createProjectTreasury !== "function") return;

const projects = getMarketplaceProjects();

projects.forEach(project => {

/* create treasury */

createProjectTreasury(project.name);

/* add initial liquidity */

if(typeof addProjectLiquidity === "function"){

addProjectLiquidity(
project.name,
100
);

}

});

localStorage.setItem(
CORE_LIQUIDITY_KEY,
true
);

}

/* =========================================
   CHECK PROJECT FUNDING
========================================= */

function getProjectFundingProgress(project){

if(typeof getProjectTreasuryStatus !== "function")
return 0;

const treasury =
getProjectTreasuryStatus(project);

const projects =
typeof getMarketplaceProjects === "function"
? getMarketplaceProjects()
: [];

const info =
projects.find(p => p.name === project);

if(!info) return 0;

const percent =
(treasury.liquidity / info.target) * 100;

return Math.min(percent,100);

}

/* =========================================
   AUTO START
========================================= */

initCoreProjectLiquidity();
