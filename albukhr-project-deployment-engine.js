/* =========================================
ALBUKHR PROJECT DEPLOYMENT ENGINE v2 (FIXED)
========================================= */

function deployInternalProject(project){

if(!project?.name) return;

const deployed = getDeployedProjects();

if(deployed.some(p=>p.name===project.name)) return;

/* NORMALIZE */
const projectKey =
typeof normalizeProjectName === "function"
? normalizeProjectName(project.name)
: project.name;

/* ===============================
VERIFY STAKING
=============================== */

if(typeof verifyUserStaking === "function" && project.email){

const stake = verifyUserStaking(project.email);

if(!stake || stake.amount < 100 || stake.duration < 3){
return;
}

}

/* ===============================
REGISTER PROJECT
=============================== */

if(typeof registerMarketplaceProject === "function"){

registerMarketplaceProject({
name: projectKey,
roi: Number(project.roi)||25,
target: project.target || 1000,
minimum: project.minimum || 10
});

}

/* ===============================
TREASURY + LIQUIDITY
=============================== */

if(typeof createProjectTreasury === "function"){
createProjectTreasury(projectKey);
}

if(typeof addProjectLiquidity === "function"){

const initial =
Math.max(Number(project.initialLiquidity)||0, 100);

addProjectLiquidity(projectKey, initial);

}

/* ===============================
UNLOCK DASHBOARD
=============================== */

if(project.email){

localStorage.setItem(
"albukhr_project_dashboard_unlocked_" + project.email,
true
);

}

/* ===============================
SAVE DEPLOYED
=============================== */

deployed.push({
name: projectKey,
deployedAt: Date.now()
});

saveDeployedProjects(deployed);

/* ===============================
EVENT
=============================== */

window.dispatchEvent(
new CustomEvent("projectDeployed")
);

}

/* AUTO RUN LOOP */
setInterval(autoDeployApproved, 3000);
