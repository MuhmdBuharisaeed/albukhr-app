/* =========================================
   ALBUKHR PROJECT CREATION ENGINE v1
========================================= */

const PROJECTS_KEY = "albukhr_projects_v1";

function getProjects(){

try{
return JSON.parse(localStorage.getItem(PROJECTS_KEY)) || [];
}catch{
return [];
}

}

function saveProjects(data){
localStorage.setItem(PROJECTS_KEY, JSON.stringify(data));
}

function createProject(){

const name =
document.getElementById("projectName").value.trim();

const desc =
document.getElementById("projectDescription").value.trim();

const roi =
Number(document.getElementById("projectROI").value);

const liquidity =
Number(document.getElementById("initialLiquidity").value);

if(!name){
alert("Project name required");
return;
}

const projects = getProjects();

if(projects.find(p=>p.name===name)){
alert("Project already exists");
return;
}

const project = {

id: "PRJ-" + Date.now(),
name,
description: desc,
roi,
owner:"internal",
createdAt: Date.now()

};

projects.push(project);

saveProjects(projects);

/* create treasury */

const treasury =
JSON.parse(localStorage.getItem("albukhr_project_treasury_v1")) || {};

treasury[name] = {
liquidity: liquidity || 0,
withdrawn:0
};

localStorage.setItem(
"albukhr_project_treasury_v1",
JSON.stringify(treasury)
);

alert("Project Created Successfully");

location.href = "project-dashboard.html";

}
