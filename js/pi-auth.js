// ==============================
// PI AUTH ENGINE (ALBUKHR)
// ==============================

let __pi_initialized = false;

/* ==============================
   INIT PI SDK
============================== */
async function initPi(){

  if(__pi_initialized) return;

  if(typeof Pi === "undefined"){
    console.error("❌ Pi SDK not loaded");
    return;
  }

  Pi.init({
    version: "2.0",
    sandbox: false // 🔥 tabbatar wannan
  });

  __pi_initialized = true;

  console.log("✅ Pi initialized");
}

/* ==============================
   ENSURE AUTH
============================== */
async function ensurePiAuth(){

  try{

    // 🔍 check existing user
    let user = Pi.getUser();

    if(user?.uid){
      console.log("✅ Already logged in:", user.username);

      localStorage.setItem("pi_user", JSON.stringify(user));
      return user;
    }

    // 🔥 LOGIN FLOW (THIS TRIGGERS POPUP)
    user = await Pi.authenticate(
      ["username", "payments"],
      function(payment){
        console.log("Payment callback:", payment);
      }
    );

    console.log("🎉 Auth success:", user.username);

    localStorage.setItem("pi_user", JSON.stringify(user));

    return user;

  }catch(e){

    console.error("❌ Auth failed:", e);
    return null;

  }

}
