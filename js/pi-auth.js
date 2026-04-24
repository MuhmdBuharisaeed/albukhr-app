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
    sandbox: false // ✅ TESTNET
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

  if(__PI_USER?.uid){
    return __PI_USER;
  }

  if(window.Pi && Pi.getUser){
    const u = Pi.getUser();

    if(u?.uid){
      __PI_USER = u;
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
