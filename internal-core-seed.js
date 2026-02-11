/* =========================================
   ALBUKHR CORE INTERNAL PROJECTS SEED
========================================= */

const INTERNAL_PROJECT_KEY = "albukhr_internal_projects_master";

/* GET ALL */
function getAllInternalProjects(){
  return JSON.parse(localStorage.getItem(INTERNAL_PROJECT_KEY)) || [];
}

/* SAVE ALL */
function saveAllInternalProjects(list){
  localStorage.setItem(INTERNAL_PROJECT_KEY, JSON.stringify(list));
}

/* CHECK IF SEEDED */
function internalProjectsSeeded(){
  return getAllInternalProjects().length > 0;
}

/* SEED CORE PROJECTS */
function seedInternalCoreProjects(){

  if(internalProjectsSeeded()) return;

  const projects = [

    {
      id: "INT-001",
      name: "Azman Features Makers Lab",
      category: "Manufacturing",
      rewardRate: 0.08,
      durationDays: 30,
      status: "active",
      createdAt: Date.now()
    },

    {
      id: "INT-002",
      name: "Laibaika Bakery Center",
      category: "Food Production",
      rewardRate: 0.07,
      durationDays: 30,
      status: "active",
      createdAt: Date.now()
    },

    {
      id: "INT-003",
      name: "Bash Agro",
      category: "Agriculture",
      rewardRate: 0.09,
      durationDays: 45,
      status: "active",
      createdAt: Date.now()
    },

    {
      id: "INT-004",
      name: "Urban Mobility",
      category: "Transport",
      rewardRate: 0.06,
      durationDays: 30,
      status: "active",
      createdAt: Date.now()
    },

    {
      id: "INT-005",
      name: "Khairat Organic Fertilizer",
      category: "Agro Industry",
      rewardRate: 0.10,
      durationDays: 60,
      status: "active",
      createdAt: Date.now()
    },

    {
      id: "INT-006",
      name: "Hauwal Sumonviter",
      category: "Processing",
      rewardRate: 0.08,
      durationDays: 30,
      status: "active",
      createdAt: Date.now()
    },

    {
      id: "INT-007",
      name: "Raheem Pharmacy",
      category: "Healthcare",
      rewardRate: 0.07,
      durationDays: 30,
      status: "active",
      createdAt: Date.now()
    }

  ];

  saveAllInternalProjects(projects);
}
