/* ===============================
   ALBUKHR – ADMIN AUTH ENGINE
================================ */

const ADMIN_KEY = "albukhr_admin_session";

/* LOGIN */
function adminLogin(username, role, secret){
  const VALID_SECRET = "ALBUKHR_CORE_2026";

  if(secret !== VALID_SECRET){
    return false;
  }

  const admin = {
    username,
    role,
    loggedInAt: Date.now()
  };

  localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
  return true;
}

/* LOGOUT */
function adminLogout(){
  localStorage.removeItem(ADMIN_KEY);
  window.location.href = "admin-login.html";
}

/* GET ADMIN */
function getAdmin(){
  return JSON.parse(localStorage.getItem(ADMIN_KEY));
}

/* ROLE GUARD */
function requireRole(allowed){
  const admin = getAdmin();

  if(!admin){
    alert("Admin login required");
    window.location.href = "admin-login.html";
    return;
  }

  if(!allowed.includes(admin.role)){
    alert("Access denied");
    window.location.href = "admin-dashboard.html";
  }
}

function getAdminRole(){
  return localStorage.getItem("albukhr_admin_role");
}

function requireRole(allowed){
  const role = getAdminRole();

  if(!role || !allowed.includes(role)){
    alert("Access denied");
    window.location.href = "index.html";
  }
}

function adminLogout(){
  localStorage.removeItem("albukhr_admin_role");
  window.location.href = "index.html";
}

localStorage.setItem("albukhr_admin_role", "super_admin");

localStorage.setItem("albukhr_admin_role", "finance_admin");
