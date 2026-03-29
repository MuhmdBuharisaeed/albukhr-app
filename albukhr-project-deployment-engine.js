/* =========================================
ALBUKHR PROJECT DEPLOYMENT ENGINE v1
Auto Deploy • Internal • Core Compatible
========================================= */

const DEPLOYED_KEY = "albukhr_deployed_projects";

/* ===============================
GET DEPLOYED
=============================== */

function getDeployedProjects(){
return JSON.parse(
localStorage.getItem(DEPLOYED_KEY)
) || [];
}

function saveDeployedProjects(list){
localStorage.setItem(
DEPLOYED_KEY,
JSON.stringify(list)
);
}

/* ===============================
DEPLOY PROJECT
=============================== */

function deployInternalProject(project){

if(!project?.name) return;

const deployed =
getDeployedProjects();

if(deployed.some(p=>p.name===project.name)){
return;
}

/* ===============================
ADD TO REGISTRY
=============================== */

if(typeof registerProject === "function"){

registerProject({

name: project.name,
category: project.category || "Internal",
roi: Number(project.roi)||25,
creator: project.owner || "Internal",
status:"active",
internal:true

});

}

/* ===============================
CREATE TREASURY
=============================== */

if(typeof createProjectTreasury === "function"){

createProjectTreasury(
project.name,
Number(project.initialLiquidity)||0
);

}

/* ===============================
ENABLE DASHBOARD
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

name: project.name,
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

/* ===============================
AUTO DEPLOY APPROVED
=============================== */

function autoDeployApproved(){

const internal =
JSON.parse(
localStorage.getItem("albukhr_internal_projects")
) || [];

internal.forEach(project=>{

if(
project.status==="approved" &&
!project.deployed
){

deployInternalProject(project);

project.deployed = true;

}

});

localStorage.setItem(
"albukhr_internal_projects",
JSON.stringify(internal)
);

}

/* ===============================
AUTO RUN
=============================== */

document.addEventListener(
"DOMContentLoaded",
autoDeployApproved
);

window.addEventListener(
"storage",
autoDeployApproved
);
