/* ==============================
   ALBUKHR – EXTERNAL STAKING CORE
   ============================== */

const EXT_PROJECT_KEY = "albukhr_external_projects";
const EXT_STAKE_KEY   = "albukhr_external_stakes";

/* ---------- HELPERS ---------- */

function load(key){
  return JSON.parse(localStorage.getItem(key) || "[]");
}

function save(key, data){
  localStorage.setItem(key, JSON.stringify(data));
}

/* ---------- PROJECTS ---------- */

function getExternalProjects(){
  return load(EXT_PROJECT_KEY);
}

function getExternalProject(id){
  return getExternalProjects().find(p => p.projectId === id);
}

function saveExternalProject(project){
  const all = getExternalProjects();
  all.push(project);
  save(EXT_PROJECT_KEY, all);
}

/* ---------- STAKING (ESCROW) ---------- */

function stakeExternalProject(projectId, userPiUID, amount){
  const projects = getExternalProjects();
  const project  = projects.find(p => p.projectId === projectId);

  if(!project) throw "Project not found";
  if(project.status !== "active") throw "Project not active";

  const stake = {
    stakeId: "STK-" + Date.now(),
    projectId,
    userPiUID,
    amount,
    status: "frozen",
    timestamp: Date.now()
  };

  const stakes = load(EXT_STAKE_KEY);
  stakes.push(stake);
  save(EXT_STAKE_KEY, stakes);

  project.totalStaked += amount;
  save(EXT_PROJECT_KEY, projects);

  return stake;
}

/* ---------- RELEASE FUNDS ---------- */

function releaseMilestone(projectId, milestoneId){
  const projects = getExternalProjects();
  const project = projects.find(p => p.projectId === projectId);

  if(!project) throw "Project not found";

  const milestone = project.milestones.find(m => m.id === milestoneId);
  if(!milestone || milestone.released) throw "Invalid milestone";

  milestone.released = true;

  // NOTE:
  // Real Pi transfer happens OUTSIDE (Pi SDK)
  // Albukhr only AUTHORISES release

  save(EXT_PROJECT_KEY, projects);
  return milestone;
}

/* ---------- EMERGENCY FREEZE ---------- */

function freezeProject(projectId, reason=""){
  const projects = getExternalProjects();
  const project = projects.find(p => p.projectId === projectId);

  if(!project) throw "Project not found";

  project.status = "frozen";
  project.freezeReason = reason;

  save(EXT_PROJECT_KEY, projects);
}

/* ---------- REFUND ---------- */

function refundProject(projectId){
  const stakes = load(EXT_STAKE_KEY);
  const affected = stakes.filter(
    s => s.projectId === projectId && s.status === "frozen"
  );

  affected.forEach(s => s.status = "refunded");
  save(EXT_STAKE_KEY, stakes);

  return affected.length;
}

/* ---------- READ-ONLY ---------- */

function getExternalStakesByUser(userPiUID){
  return load(EXT_STAKE_KEY).filter(s => s.userPiUID === userPiUID);
}

function getExternalStakesByProject(projectId){
  return load(EXT_STAKE_KEY).filter(s => s.projectId === projectId);
}
