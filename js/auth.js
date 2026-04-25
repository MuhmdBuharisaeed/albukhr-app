// =======================================
// PI AUTH + LOCALSTORAGE (PRODUCTION)
// =======================================

let __PI_USER = null;

/* ===============================
   INIT PI
=============================== */
function initPi(){

  if(typeof Pi === "undefined"){
    console.error("❌ Pi SDK missing");
    return;
  }

  Pi.init({
    version: "2.0",
    sandbox: true
  });

}

/* ===============================
   SAVE USER
=============================== */
function saveUser(user){
  localStorage.setItem("pi_user", JSON.stringify(user));
}

/* ===============================
   LOAD USER
=============================== */
function loadUser(){

  const saved = localStorage.getItem("pi_user");

  if(!saved) return null;

  try{
    const user = JSON.parse(saved);

    if(user?.uid){
      __PI_USER = user;
      return user;
    }
  }catch(e){}

  return null;
}

/* ===============================
   AUTHENTICATE
=============================== */
async function authenticatePi(){

  try{

    const user = await Pi.authenticate(
      ['username','payments'],
      ()=>{}
    );

    if(!user?.uid){
      throw new Error("Invalid user");
    }

    __PI_USER = user;

    saveUser(user); // ✅ STORE

    return user;

  }catch(e){
    console.error("❌ Auth failed:", e);
    return null;
  }

}

/* ===============================
   ENSURE AUTH
=============================== */
async function ensurePiAuth(){

  // 1. INIT
  initPi();

  // 2. MEMORY
  if(__PI_USER?.uid){
    return __PI_USER;
  }

  // 3. LOCAL STORAGE
  const saved = loadUser();
  if(saved){
    return saved;
  }

  // 4. SAFE Pi.getUser (optional)
  try{
    if(window.Pi && Pi.getUser){
      const u = Pi.getUser();

      if(u?.uid){
        __PI_USER = u;
        saveUser(u);
        return u;
      }
    }
  }catch(e){}

  // 5. AUTHENTICATE (FINAL)
  return await authenticatePi();
}
