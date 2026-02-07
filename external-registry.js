const EXTERNAL_KEY = "albukhr_external_projects";

/* LOAD */
function getExternalProjects(){
  return JSON.parse(localStorage.getItem(EXTERNAL_KEY)) || [];
}

/* SAVE */
function saveExternalProjects(list){
  localStorage.setItem(EXTERNAL_KEY, JSON.stringify(list));
}

/* UPDATE STATUS */
function updateExternalStatus(id,status){
  const list = getExternalProjects();
  const p = list.find(x=>x.id===id);
  if(p){
    p.status = status;
    p.reviewedAt = new Date().toISOString();
  }
  saveExternalProjects(list);
}
