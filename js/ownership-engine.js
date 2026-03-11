/* =========================================
   ALBUKHR PROJECT OWNERSHIP ENGINE v1
   Tracks project owners securely
========================================= */

const OWNER_KEY = "albukhr_project_owners";

/* ===============================
   GET OWNERS
================================ */

function getProjectOwners(){
  try{
    return JSON.parse(localStorage.getItem(OWNER_KEY)) || {};
  }catch{
    return {};
  }
}

function saveProjectOwners(data){
  localStorage.setItem(OWNER_KEY, JSON.stringify(data));
}

/* ===============================
   REGISTER OWNER
================================ */

function registerProjectOwner(project, email){

  const owners = getProjectOwners();

  if(!owners[project]){
    owners[project] = [];
  }

  if(!owners[project].includes(email)){
    owners[project].push(email);
  }

  saveProjectOwners(owners);
}

/* ===============================
   CHECK OWNER
================================ */

function isProjectOwner(project){

  const owners = getProjectOwners();
  const email = localStorage.getItem("albukhr_current_email");

  if(!email) return false;

  if(!owners[project]) return false;

  return owners[project].includes(email);
}

/* ===============================
   GET OWNER LIST
================================ */

function getOwnerList(project){

  const owners = getProjectOwners();

  return owners[project] || [];

    }
