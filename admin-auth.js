/* ===============================
   ALBUKHR – ADMIN AUTH ENGINE
================================ */

const ADMIN_KEY = "albukhr_admin_user";

/* -------------------------------
   LOGIN (DEV MODE)
-------------------------------- */
function adminLogin(username, role){
  const admin = {
    username,
    role,
    loggedInAt: Date.now()
  };
  localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
}

/* -------------------------------
   LOGOUT
-------------------------------- */
function adminLogout(){
  localStorage.removeItem(ADMIN_KEY);
  window.location.href = "index.html";
}

/* -------------------------------
   GET CURRENT ADMIN
-------------------------------- */
function getAdmin(){
  return JSON.parse(localStorage.getItem(ADMIN_KEY));
}

/* -------------------------------
   ROLE CHECK
-------------------------------- */
function requireRole(allowedRoles = []){
  const admin = getAdmin();

  if(!admin){
    alert("Admin access required");
    window.location.href = "index.html";
    return false;
  }

  if(!allowedRoles.includes(admin.role)){
    alert("Permission denied");
    window.location.href = "index.html";
    return false;
  }

  return true;
}
