// =======================================
// PI AUTH ENGINE (PRODUCTION READY)
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
    sandbox: true // ✅ TESTNET
  });

  console.log("✅ Pi initialized");
}

/* ===============================
   AUTHENTICATE
=============================== */
async function authenticatePi(){

  try{

    const scopes = ['username','payments'];

    const user = await Pi.authenticate(scopes, function(payment){
      console.log("💰 Payment callback:", payment);
    });

    if(!user?.uid){
      throw new Error("Invalid Pi user");
    }

    __PI_USER = user;

    console.log("✅ Auth success:", user);

    return user;

  }catch(e){
    console.error("❌ Auth failed:", e);
    throw e;
  }

}

/* ===============================
   GET USER
=============================== */
function getCurrentUser(){

  /* ✅ MEMORY FIRST */
  if(__PI_USER?.uid){
    return __PI_USER;
  }

  /* ✅ STORAGE */
  const saved = localStorage.getItem("pi_user");

  if(saved){
    try{
      const parsed = JSON.parse(saved);

      if(parsed?.uid){
        __PI_USER = parsed;
        return parsed;
      }
    }catch(e){}
  }

  /* ✅ PI SDK FALLBACK */
  if(window.Pi && Pi.getUser){
    const u = Pi.getUser();

    if(u?.uid){
      __PI_USER = u;

      localStorage.setItem("pi_user", JSON.stringify(u)); // ✅ sync

      return u;
    }
  }

  return null;
}

/* ===============================
   ENSURE AUTH
=============================== */
async function ensurePiAuth(){

  let user = getCurrentUser();

  if(user){
    return user;
  }

  return await authenticatePi();
}

__PI_USER = user;

localStorage.setItem("pi_user", JSON.stringify(user)); // ✅ ADD THIS

console.log("✅ Auth success:", user);

