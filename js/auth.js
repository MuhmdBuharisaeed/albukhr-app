// =======================================
// ALBUKHR PRO AUTH SYSTEM (FINAL)
// =======================================

let CURRENT_USER = null;

/* ===============================
   INIT PI
=============================== */
function initPi(){

  if(!window.Pi){
    console.warn("Pi SDK not loaded");
    return false;
  }

  try{
    Pi.init({
      version: "2.0",
      sandbox: false
    });
    return true;
  }catch(e){
    console.error("Pi init failed", e);
    return false;
  }

}

/* ===============================
   STORAGE
=============================== */
function saveUser(user){
  localStorage.setItem("pi_user", JSON.stringify(user));
}

function loadUser(){
  try{
    const u = JSON.parse(localStorage.getItem("pi_user"));
    if(u && u.uid){
      CURRENT_USER = u;
      return u;
    }
  }catch{}
  return null;
}

function clearUser(){
  localStorage.removeItem("pi_user");
  CURRENT_USER = null;
}

/* ===============================
   PI SESSION (NO POPUP)
=============================== */
function getPiUser(){

  try{
    if(window.Pi && Pi.getUser){
      const u = Pi.getUser();
      if(u && u.uid){
        saveUser(u);
        CURRENT_USER = u;
        return u;
      }
    }
  }catch{}

  return null;

}

/* ===============================
   REAL LOGIN (POPUP)
=============================== */
async function authenticatePi(){

  if(!initPi()) return null;

  try{

    const user = await Pi.authenticate(
      ['username','payments'],
      () => {}
    );

    if(user && user.uid){
      saveUser(user);
      CURRENT_USER = user;
      return user;
    }

  }catch(e){
    console.error("Auth error", e);
  }

  return null;

}

/* ===============================
   SMART AUTH (NO POPUP)
=============================== */
async function ensurePiAuth(){

  if(CURRENT_USER) return CURRENT_USER;

  const local = loadUser();
  if(local) return local;

  const piUser = getPiUser();
  if(piUser) return piUser;

  // ❌ NO AUTO LOGIN HERE
  return null;

}

/* ===============================
   MANUAL LOGIN BUTTON
=============================== */
async function startLogin(){

  const user = await authenticatePi();

  if(!user){
    alert("Login failed");
    return;
  }

  window.CURRENT_USER = user;

  location.reload();

}

/* ===============================
   LOGOUT
=============================== */
function logout(){
  clearUser();
  location.href = "login.html";
}
