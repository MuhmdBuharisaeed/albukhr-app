// ===============================
// ALBUKHR INTERNAL REGISTRY
// ===============================

const INTERNAL_KEY = "albukhr_internal_projects";

/* LOAD */
function getInternalProjects(){
  try{
    return JSON.parse(localStorage.getItem(INTERNAL_KEY)) || [];
  }catch{
    return [];
  }
}

/* SAVE */
function saveInternalProjects(list){
  localStorage.setItem(INTERNAL_KEY, JSON.stringify(list));
}

/* ADD (PENDING) */
function addInternalProject(project){
  const list = getInternalProjects();

  list.push({
    id: Date.now(),
    ...project,
    status: "pending",   // 🔒 important
    createdAt: new Date().toISOString()
  });

  saveInternalProjects(list);
}

/* APPROVE */
function approveInternalProject(id){
  const list = getInternalProjects();

  list.forEach(p=>{
    if(p.id === id){
      p.status = "approved";
      p.approvedAt = new Date().toISOString();
    }
  });

  saveInternalProjects(list);
}

/* REJECT */
function rejectInternalProject(id){
  const list = getInternalProjects().filter(p=>p.id !== id);
  saveInternalProjects(list);
}


const KEY = "albukhr_internal_projects";

function getInternalProjects(){
  return JSON.parse(localStorage.getItem(KEY)) || [];
}

function saveInternalProjects(list){
  localStorage.setItem(KEY, JSON.stringify(list));
}

function registerInternalProject(data){
  const list = getInternalProjects();
  list.push(data);
  saveInternalProjects(list);
}

function updateInternalStatus(id,status){
  const list = getInternalProjects();
  const p = list.find(x=>x.id===id);
  if(p) p.status = status;
  saveInternalProjects(list);
}

function updateInternalStage(id,stage){
  const list = getInternalProjects();
  const p = list.find(x=>x.id===id);
  if(p) p.stage = stage;
  saveInternalProjects(list);
     }
