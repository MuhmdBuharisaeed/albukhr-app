/* =================================
   ALBUKHR – ADMIN AUTH ENGINE
================================= */

const ADMIN_KEY = "albukhr_admin_session";

/*
 Session structure example:
 {
   username: "albukhr_root",
   role: "super_admin",
   loginAt: 1700000000000
 }
*/


/* -------------------------------
   LOGIN ADMIN
-------------------------------- */
function adminLogin(username, role){
  const session = {
    username,
    role,
    loginAt: Date.now()
  };

  localStorage.setItem(ADMIN_KEY, JSON.stringify(session));
}


/* -------------------------------
   LOGOUT ADMIN
-------------------------------- */
function adminLogout(){
  localStorage.removeItem(ADMIN_KEY);
  window.location.href = "index.html";
}


/* -------------------------------
   GET CURRENT ADMIN
-------------------------------- */
function getAdmin(){
  const raw = localStorage.getItem(ADMIN_KEY);
  if(!raw) return null;

  try{
    return JSON.parse(raw);
  }catch(e){
    return null;
  }
}


/* -------------------------------
   REQUIRE ROLE (PAGE GUARD)
-------------------------------- */
function requireRole(allowedRoles){

  const admin = getAdmin();

  if(!admin){
    alert("Admin access required");
    window.location.href = "index.html";
    return;
  }

  if(!allowedRoles.includes(admin.role)){
    alert("You do not have permission to access this page");
    window.location.href = "index.html";
    return;
  }

}


/* -------------------------------
   PERMISSION HELPERS
-------------------------------- */
function canReviewProjects(){
  const admin = getAdmin();
  return admin && (
    admin.role === "super_admin" ||
    admin.role === "review_admin"
  );
}

function canManageFinance(){
  const admin = getAdmin();
  return admin && (
    admin.role === "super_admin" ||
    admin.role === "finance_admin"
  );
}

function isSuperAdmin(){
  const admin = getAdmin();
  return admin && admin.role === "super_admin";
}
