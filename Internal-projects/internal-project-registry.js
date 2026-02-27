/* =========================================
   ALBUKHR INTERNAL PROJECT REGISTRY
========================================= */

const INTERNAL_PROJECTS_KEY = "albukhr_internal_projects_v1";

/* DEFAULT CORE PROJECTS */
const DEFAULT_INTERNAL_PROJECTS = [
  {
    id:"azman-makers-lab",
    name:"Azman Features Makers Lab",
    category:"Manufacturing",
    durationDays:90,
    rewardRate:0.08,
    status:"active"
  },
  {
    id:"laibaika-bakery",
    name:"Laibaika Bakery Center",
    category:"Food Production",
    durationDays:60,
    rewardRate:0.06,
    status:"active"
  },
  {
    id:"bash-agro",
    name:"Bash Agro",
    category:"Agriculture",
    durationDays:120,
    rewardRate:0.10,
    status:"active"
  },
  {
    id:"urban-mobility",
    name:"Urban Mobility",
    category:"Transport",
    durationDays:75,
    rewardRate:0.07,
    status:"active"
  },
  {
    id:"khairat-organic",
    name:"Khairat Organic Fertilizer",
    category:"Agro Processing",
    durationDays:90,
    rewardRate:0.08,
    status:"active"
  },
  {
    id:"hauwal-sumonviter",
    name:"Hauwal Sumonviter",
    category:"Retail",
    durationDays:45,
    rewardRate:0.05,
    status:"active"
  },
  {
    id:"raheem-pharmacy",
    name:"Raheem Pharmacy",
    category:"Healthcare",
    durationDays:60,
    rewardRate:0.06,
    status:"active"
  }
];

/* INIT ON FIRST LOAD */
function initInternalProjects(){
  if(!localStorage.getItem(INTERNAL_PROJECTS_KEY)){
    localStorage.setItem(
      INTERNAL_PROJECTS_KEY,
      JSON.stringify(DEFAULT_INTERNAL_PROJECTS)
    );
  }
}

/* GET ALL PROJECTS */
function getAllInternalProjects(){
  return JSON.parse(localStorage.getItem(INTERNAL_PROJECTS_KEY)) || [];
}

/* GET PROJECT BY ID */
function getInternalProject(id){
  return getAllInternalProjects().find(p=>p.id===id);
}
