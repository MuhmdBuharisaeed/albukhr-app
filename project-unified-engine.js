/* =========================================
   ALBUKHR UNIFIED PROJECT POOL ENGINE
========================================= */

/* =========================================
   FETCH ALL ACTIVE PROJECTS
========================================= */

function getAllActiveProjects(){

  const internal =
    typeof getInternalLiveProjects === "function"
      ? getInternalLiveProjects().map(p => ({
          ...p,
          type: "internal"
        }))
      : [];

  const external =
    typeof getExternalLiveProjects === "function"
      ? getExternalLiveProjects().map(p => ({
          ...p,
          type: "external"
        }))
      : [];

  return [...internal, ...external];
}

/* =========================================
   FETCH SINGLE PROJECT (ANY TYPE)
========================================= */

function getProjectById(id){

  const all = getAllActiveProjects();
  return all.find(p =>
    p.projectId === id || p.id === id
  );
}
