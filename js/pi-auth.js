// =======================================
// PI AUTH ENGINE (PRODUCTION)
// =======================================

let __piUser = null;
let __piReady = false;

/* ===============================
   INIT PI
=============================== */
function initPiSDK(){

  if(typeof Pi === "undefined"){
    console.error("❌ Pi SDK not loaded");
    return;
  }

  Pi.init({
    version: "2.0",
    sandbox: false // 🔥 TESTNET / MAINNET READY
  });

  console.log("✅ Pi SDK initialized");
}

/* ===============================
   AUTHENTICATE USER
=============================== */
async function authenticatePi(){

  if(typeof Pi === "undefined"){
    throw new Error("Pi SDK missing");
  }

  try{

    const scopes = ['username','payments'];

    const user = await Pi.authenticate(scopes, function(payment){
      console.log("💰 Payment callback:", payment);
    });

    if(!user?.uid){
      throw new Error("Invalid Pi user");
    }

    __piUser = user;
    __piReady = true;

    console.log("✅ Pi User:", user);

    return user;

  }catch(e){

    console.error("❌ Pi Auth failed:", e);
    throw e;

  }
}

/* ===============================
   GET CURRENT USER
=============================== */
function getCurrentUser(){

  if(__piUser?.uid){
    return __piUser;
  }

  if(window.Pi && Pi.getUser){
    const u = Pi.getUser();
    if(u?.uid){
      __piUser = u;
      return u;
    }
  }

  return null;
}

/* ===============================
   ENSURE AUTH (AUTO)
=============================== */
async function ensurePiAuth(){

  let user = getCurrentUser();

  if(user){
    return user;
  }

  return await authenticatePi();
}
