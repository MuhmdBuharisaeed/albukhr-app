// =======================================
// ALBUKHR PRO AUTH SYSTEM (PI SDK)
// =======================================

let CURRENT_USER = null;

/* ===============================
   INIT PI SDK
=============================== */
function initPi(){

  if(typeof Pi === "undefined"){
    console.error("❌ Pi SDK not loaded");
    return false;
  }

  try{
    Pi.init({
      version: "2.0",
      sandbox: false
    });
    return true;
  }catch(e){
    console.error("❌ Pi init error:", e);
    return false;
  }

}

/* ===============================
   SAVE USER
=============================== */
function saveUser(user){
  localStorage.setItem("pi_user", JSON.stringify(user));
}

/* ===============================
   LOAD USER (LOCAL STORAGE)
=============================== */
function loadUser(){

  try{

    const saved = localStorage.getItem("pi_user");

    if(!saved) return null;

    const user = JSON.parse(saved);

    if(user && user.uid){
      CURRENT_USER = user;
      return user;
    }

  }catch(e){
    console.warn("⚠️ Corrupted user data");
  }

  return null;

}

/* ===============================
   CLEAR USER (LOGOUT)
=============================== */
function clearUser(){
  localStorage.removeItem("pi_user");
  CURRENT_USER = null;
}

/* ===============================
   AUTHENTICATE VIA PI
=============================== */
async function authenticatePi(){

  try{

    if(!initPi()){
      throw new Error("Pi not initialized");
    }

    const user = await Pi.authenticate(
      ['username','payments'],
      () => {}
    );

    if(!user || !user.uid){
      throw new Error("Invalid Pi user");
    }

    CURRENT_USER = user;

    saveUser(user);

    return user;

  }catch(e){

    console.error("❌ Pi Auth failed:", e);
    return null;

  }

}

/* ===============================
   GET USER FROM PI SDK
=============================== */
function getPiUser(){

  try{

    if(window.Pi && Pi.getUser){

      const user = Pi.getUser();

      if(user && user.uid){
        CURRENT_USER = user;
        saveUser(user);
        return user;
      }

    }

  }catch(e){
    console.warn("⚠️ Pi.getUser failed");
  }

  return null;

}

/* ===============================
   ENSURE AUTH (MAIN ENGINE)
=============================== */
let AUTH_RUNNING = false;
let AUTH_DONE = false;

async function ensurePiAuth(){

  // ✅ 1. MEMORY
  if(CURRENT_USER && CURRENT_USER.uid){
    return CURRENT_USER;
  }

  // ❌ STOP LOOP
  if(AUTH_RUNNING || AUTH_DONE){
    return null;
  }

  AUTH_RUNNING = true;

  try{

    // ✅ 2. LOCAL STORAGE
    const local = loadUser();
    if(local){
      return local;
    }

    // ✅ 3. PI SDK SESSION
    const piUser = getPiUser();
    if(piUser){
      return piUser;
    }

    // 🔥 4. AUTH ONLY ONCE
    const user = await authenticatePi();

    return user;

  }catch(e){
    console.error("Auth flow error:", e);
    return null;
  }finally{
    AUTH_RUNNING = false;
    AUTH_DONE = true; // 🔥 THIS STOPS REPEAT
  }

}

/* ===============================
   REQUIRE AUTH (PAGE GUARD)
=============================== */
async function requireAuth(){

  const user = await ensurePiAuth();

  if(!user){
    window.location.href = "login.html";
    return null;
  }

  return user;

}

/* ===============================
   LOGOUT
=============================== */
function logout(){

  clearUser();

  // reload to reset state
  location.href = "login.html";

}
