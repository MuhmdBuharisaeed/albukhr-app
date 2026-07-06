let __pi_initialized = false;
let __pi_user = null;

/* ===============================
   INIT PI
=============================== */
async function initPi(){

  if(__pi_initialized) return;

  if(typeof Pi === "undefined"){
    console.error("❌ Pi SDK missing");
    return;
  }

  await Pi.init({
  version: "2.0",
  sandbox: false
});

  __pi_initialized = true;

  console.log("✅ Pi initialized");

}

/* ===============================
   AUTH
=============================== */
async function ensurePiAuth(){

  // Return user already loaded
  if(__pi_user){
    return __pi_user;
  }

  // Return cached user
  const cached = JSON.parse(
    localStorage.getItem("pi_user")
  );

  if(cached?.uid){
    __pi_user = cached;
    return cached;
  }

  try{

    const scopes = [
      "username",
      "payments",
      "wallet_address"
    ];

    const { user: piUser, accessToken } =
      await Pi.authenticate(
        scopes,
        function(payment){
          console.log("Payment callback:", payment);
        }
      );

    console.log("FULL AUTH:", piUser, accessToken);

    const user = {
      uid: piUser?.uid,
      username: piUser?.username,
      wallet_address: piUser?.wallet_address,
      accessToken
    };

    if(!user.uid){
      throw new Error("UID missing");
    }

    __pi_user = user;

    localStorage.setItem(
      "pi_user",
      JSON.stringify(user)
    );

    return user;

  }catch(e){

    console.error("❌ Auth failed:", e);

    return null;

  }

}
