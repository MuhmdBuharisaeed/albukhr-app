/* =========================================
   ALBUKHR PROJECT CREATION ENGINE v2
========================================= */

const PROJECTS_KEY = "albukhr_projects_v2";

/* ===============================
   LOAD PROJECTS
=============================== */

function getProjects(){

try{
return JSON.parse(localStorage.getItem(PROJECTS_KEY)) || [];
}catch{
return [];
}

}

/* ===============================
   SAVE PROJECTS
=============================== */

function saveProjects(list){

localStorage.setItem(
PROJECTS_KEY,
JSON.stringify(list)
);

}

/* ===============================
   REGISTER PROJECT
=============================== */

function registerProject(project){

if(!project?.name){
return {error:"Project name required"};
}

const projects = getProjects();

/* prevent duplicates */

const exists =
projects.find(p => p.name === project.name);

if(exists){
return {error:"Project already exists"};
}

/* project object */

const data = {

id: "PRJ-" + Date.now(),

name: project.name,

description: project.description || "",

type: project.type || "external",

roi: Number(project.roi) || 0,

liquidity: Number(project.liquidity) || 0,

minimum: Number(project.minimum) || 1,

target: Number(project.target) || 1000,

status: "funding",

investors: 0,

createdAt: Date.now()

};

projects.push(data);

saveProjects(projects);

return {
success:true,
project:data
};

}

/* ===============================
   GET SINGLE PROJECT
=============================== */

function getProject(name){

const projects = getProjects();

return projects.find(p => p.name === name);

}

/* ===============================
   UPDATE STATUS
=============================== */

function updateProjectStatus(name,status){

const projects = getProjects();

const p = projects.find(x => x.name === name);

if(!p) return;

p.status = status;

saveProjects(projects);

}

/* ===============================
   INVESTOR COUNT
=============================== */

function increaseInvestor(project){

const projects = getProjects();

const p = projects.find(x => x.name === project);

if(!p) return;

p.investors++;

saveProjects(projects);

}
