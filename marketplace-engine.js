/* =========================================
   ALBUKHR MARKETPLACE ENGINE v2
   Auto discovers projects from ecosystem
========================================= */

function getMarketplaceProjects(){

let projects = [];

/* 1️⃣ PROJECT REGISTRY */

if(typeof getProjects === "function"){

const registry = getProjects();

if(Array.isArray(registry)){
projects = registry;
}

}

/* 2️⃣ STAKING DISCOVERY */

if(typeof getAllStakesMerged === "function"){

const stakes = getAllStakesMerged();

stakes.forEach(stake => {

if(!stake.project) return;

const exists =
projects.find(p => p.name === stake.project);

if(!exists){

projects.push({
name: stake.project,
description: "Community discovered project",
roi: 0,
minimum: 1,
target: 1000
});

}

});

}

return projects;

}
