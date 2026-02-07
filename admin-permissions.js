const ADMIN_KEY = "albukhr_admin_accounts";

/* LOAD */
function getAdmins(){
  return JSON.parse(localStorage.getItem(ADMIN_KEY)) || [];
}

/* SAVE */
function saveAdmins(list){
  localStorage.setItem(ADMIN_KEY, JSON.stringify(list));
}

/* ADD ADMIN */
function addAdmin(data){
  const list = getAdmins();
  list.push({
    id: Date.now(),
    status: "active",
    createdAt: new Date().toISOString(),
    ...data
  });
  saveAdmins(list);
}

/* UPDATE ROLE */
function updateAdminRole(id,role){
  const list = getAdmins();
  const admin = list.find(a=>a.id===id);
  if(admin) admin.role = role;
  saveAdmins(list);
}

/* TOGGLE STATUS */
function toggleAdminStatus(id){
  const list = getAdmins();
  const admin = list.find(a=>a.id===id);
  if(admin){
    admin.status = admin.status==="active" ? "suspended" : "active";
  }
  saveAdmins(list);
}
