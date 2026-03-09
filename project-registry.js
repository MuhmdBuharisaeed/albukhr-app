/* =========================================
   ALBUKHR PROJECT REGISTRY v1
   Stores all projects in ecosystem
========================================= */

const PROJECT_KEY = "albukhr_projects_registry_v1";

/* CORE PROJECTS */

const ALBUKHR_CORE_PROJECTS = [

{
name:"Barsh Agro",
description:"Modern agricultural production and food supply chain.",
roi:18,
minimum:1,
target:1000,
sector:"Agriculture"
},

{
name:"Labbaika Bakery",
description:"Industrial bakery producing bread and flour products.",
roi:15,
minimum:1,
target:800,
sector:"Food Production"
},

{
name:"Raheem Pharma",
description:"Pharmaceutical production and medical supplies.",
roi:20,
minimum:2,
target:1500,
sector:"Healthcare"
},

{
name:"Urban Transport",
description:"Smart transportation and logistics services.",
roi:17,
minimum:1,
target:1200,
sector:"Transport"
},

{
name:"Khairat Recycling",
description:"Recycling and environmental sustainability project.",
roi:16,
minimum:1,
target:900,
sector:"Environment"
},

{
name:"Azman Chemical",
description:"Chemical production and industrial materials.",
roi:19,
minimum:2,
target:1400,
sector:"Industrial"
},

{
name:"Hauwal Maize",
description:"Maize farming and grain processing industry.",
roi:18,
minimum:1,
target:1100,
sector:"Agriculture"
}

];

/* LOAD PROJECTS */

function getProjects(){

try{

return JSON.parse(
localStorage.getItem(PROJECT_KEY)
) || [];

}catch{

return [];

}

}

/* SAVE PROJECTS */

function saveProjects(data){

localStorage.setItem(
PROJECT_KEY,
JSON.stringify(data)
);

}

/* INIT CORE PROJECTS */

function initCoreProjects(){

let stored = getProjects();

if(!stored.length){

stored = ALBUKHR_CORE_PROJECTS;

saveProjects(stored);

}

}

/* ADD PROJECT */

function addProject(project){

const list = getProjects();

list.push(project);

saveProjects(list);

}

/* REMOVE PROJECT */

function removeProject(name){

let list = getProjects();

list = list.filter(p => p.name !== name);

saveProjects(list);

}

/* AUTO INIT */

initCoreProjects();
