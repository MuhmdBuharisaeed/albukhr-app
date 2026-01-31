/* ===============================
   ALBUKHR ADMIN AUTH ENGINE
================================ */

const ADMIN_SESSION_KEY = "albukhr_admin_session";

/* LOGIN */
function adminLogin(username, role){
  const session = {
    username,
    role,
    loginAt: Date.now()
  };
  localStorage.setItem(
    ADMIN_SESSION_KEY,
    JSON.stringify(session)
  );
}

/* LOGOUT */
function adminLogout(){
  localStorage.removeItem(ADMIN_SESSION_KEY);
  window.location.href = "admin-login.html";
}

/* GET SESSION */
function getAdmin(){
  return JSON.parse(
    localStorage.getItem(ADMIN_SESSION_KEY)
  );
}

/* ROLE GUARD */
function requireRole(roles){
  const admin = getAdmin();

  if(!admin){
    alert("Admin login required");
    window.location.href = "admin-login.html";
    return;
  }

  if(!roles.includes(admin.role)){
    alert("Access denied: insufficient role");
    window.location.href = "index.html";
  }
}
