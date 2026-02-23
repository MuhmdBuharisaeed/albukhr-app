/* ==========================================
   ALBUKHR – SECURE ADMIN AUTH ENGINE
========================================== */

const ADMIN_SESSION_KEY = "albukhr_admin_session";
const SESSION_DURATION = 2 * 60 * 60 * 1000; // 2 hours

/* ==========================================
   LOGIN
========================================== */
function adminLogin(username, role, secret){

  const VALID_SECRET = "ALBUKHR_CORE_2026";

  if(secret !== VALID_SECRET){
    return false;
  }

  const session = {
    username: username,
    role: role,
    loginTime: Date.now(),
    expiresAt: Date.now() + SESSION_DURATION
  };

  localStorage.setItem(
    ADMIN_SESSION_KEY,
    JSON.stringify(session)
  );

  return true;
}

/* ==========================================
   GET SESSION
========================================== */
function getAdminSession(){
  const raw = localStorage.getItem(ADMIN_SESSION_KEY);
  if(!raw) return null;

  try{
    const session = JSON.parse(raw);

    // Check expiry
    if(Date.now() > session.expiresAt){
      localStorage.removeItem(ADMIN_SESSION_KEY);
      return null;
    }

    return session;

  }catch(e){
    localStorage.removeItem(ADMIN_SESSION_KEY);
    return null;
  }
}

/* ==========================================
   REQUIRE ROLE (GUARD)
========================================== */
function requireRole(allowedRoles){

  const session = getAdminSession();

  if(!session){
    alert("Admin login required");
    window.location.href = "admin-login.html";
    return;
  }

  if(!allowedRoles.includes(session.role)){
    alert("Access denied");
    window.location.href = "unified-admin-buttons.html";
    return;
  }
}

/* ==========================================
   LOGOUT
========================================== */
function adminLogout(){
  localStorage.removeItem(ADMIN_SESSION_KEY);
  window.location.href = "admin-login.html";
}

/* ==========================================
   GET ROLE HELPER
========================================== */
function getAdminRole(){
  const session = getAdminSession();
  return session ? session.role : null;
}
