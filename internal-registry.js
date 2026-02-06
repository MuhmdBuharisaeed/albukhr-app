/* =====================================
   ALBUKHR – INTERNAL PROJECT REGISTRY
===================================== */

const INTERNAL_KEY = "albukhr_internal_projects";

/* -------------------------
   HELPERS
------------------------- */
function getInternalProjects(){
  return JSON.parse(localStorage.getItem(INTERNAL_KEY)) || [];
}

function saveInternalProjects(list){
  localStorage.setItem(INTERNAL_KEY, JSON.stringify(list));
}

/* -------------------------
   CREATE INTERNAL PROJECT
------------------------- */
function createInternalProject(data){
  const list = getInternalProjects();
  list.push(data);
  saveInternalProjects(list);
}

/* -------------------------
   UPDATE STATUS
------------------------- */
function updateInternalStatus(id, status){
  const list = getInternalProjects();
  const p = list.find(x => x.id === id);
  if(!p) return;
  p.status = status;
  saveInternalProjects(list);
}
