// =======================================
// ALBUKHR PI AUTH (TESTNET VERSION)
// =======================================

let CURRENT_USER = null;
let PI_INITIALIZED = false;

/* ===============================
   INIT PI SDK
=============================== */
function initPi(){

  if(PI_INITIALIZED) return;

  if(typeof Pi === "undefined"){
    console.error("❌ Pi SDK not loaded");
    return;
  }

  Pi.init({
    version: "2.0",
    sandbox: true // ✅ TESTNET MODE
  });

  PI_INITIALIZED = true;
}

/* ===============================
   SAVE USER (LOCAL CACHE)
=============================== */
function saveUser(user){
  localStorage.setItem("pi_user", JSON.stringify(user));
}

/* ===============================
   LOAD USER (CACHE ONLY)
=============================== */
function loadUser(){

  try{
    const saved = localStorage.getItem("pi_user");
    if(!saved) return null;

    const user = JSON.parse(saved);

    if(user?.uid){
      return user;
    }

  }catch(e){}

  return null;
}

/* ===============================
   PAYMENT HANDLER
=============================== */
function onIncompletePaymentFound(payment){
  console.warn("⚠️ Incomplete payment found:", payment);

  // store for debugging / retry
  localStorage.setItem(
    "last_incomplete_payment",
    JSON.stringify(payment)
  );
}

/* ===============================
   AUTHENTICATE USER
=============================== */
async function authenticatePi(){

  try{

    const scopes = ['username','payments'];

    const auth = await Pi.authenticate(
      scopes,
      onIncompletePaymentFound
    );

    if(!auth?.user?.uid){
      throw new Error("Invalid Pi user");
    }

    CURRENT_USER = auth.user;

    saveUser(auth.user);

    console.log("✅ Pi Auth success:", auth.user);

    return auth.user;

  }catch(e){

    console.error("❌ Pi Auth failed:", e);

    return null;
  }

}

/* ===============================
   ENSURE AUTH (MAIN ENTRY)
=============================== */
async function ensurePiAuth(){

  // 1. INIT SDK
  initPi();

  // 2. MEMORY
  if(CURRENT_USER?.uid){
    return CURRENT_USER;
  }

  // 3. CACHE
  const cached = loadUser();

  if(cached){
    CURRENT_USER = cached;
  }

  // 4. FORCE AUTH (SAFE)
  const user = await authenticatePi();

  return user;

}

/* ===============================
   TEST PAYMENT (STAKING)
=============================== */
async function createTestPayment(amount, project="demo"){

  try{

    const payment = await Pi.createPayment({

      amount: Number(amount),

      memo: "Albukhr Testnet Stake",

      metadata: {
        type: "staking",
        project: project
      }

    });

    console.log("💰 Payment created:", payment);

    // ============================
    // LOCAL STAKE SIMULATION
    // ============================

    const stakes = JSON.parse(
      localStorage.getItem("albukhr_stakes") || "[]"
    );

    stakes.push({
      project: project,
      amount: Number(amount),
      timestamp: Date.now()
    });

    localStorage.setItem(
      "albukhr_stakes",
      JSON.stringify(stakes)
    );

    return payment;

  }catch(e){

    console.error("❌ Payment failed:", e);

    return null;
  }

}

/* ===============================
   GET LOCAL STAKES
=============================== */
function getLocalStakes(){

  return JSON.parse(
    localStorage.getItem("albukhr_stakes") || "[]"
  );

}
