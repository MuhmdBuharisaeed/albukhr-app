/* ===============================
   ALBUKHR STAKING CORE
   Safe Gateway Layer
================================ */

/* PROJECT TYPE CHECK */
function getProjectType(project){
  const internal = getInternalProjects()
    .some(p => p.name === project && p.status === "approved");

  return internal ? "internal" : "external";
}

/* ===============================
   ADD STAKE (ROUTER)
================================ */
function coreAddStake(payload){

  const type = getProjectType(payload.project);

  if(type === "internal"){
    return addInternalStake(payload);
  }

  if(type === "external"){
    return addExternalStake(payload);
  }

  return false;
}

/* ===============================
   TOTALS (HOME SAFE)
================================ */
function coreGetTotals(){
  return {
    internal: getInternalTotals(),
    external: getExternalTotals()
  };
}

/* ===============================
   PROJECT TOTALS
================================ */
function coreGetProjectTotals(project){

  const type = getProjectType(project);

  if(type === "internal"){
    return getInternalProjectTotals(project);
  }

  if(type === "external"){
    return getExternalProjectTotals(project);
  }

  return { stake:0, reward:0, stakes:[] };
}
