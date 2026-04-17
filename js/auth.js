// =======================================
// ALBUKHR AUTH SYSTEM (FINAL)
// Pi SDK • Auto Login • Secure
// =======================================

const AUTH_KEY = "pi_user";

/* ======================================
   SAVE USER (SAFE)
====================================== */
function saveUser(user){

  if(!user || !user.uid){
    console.warn("⚠️ Invalid user");
    return;
  }

  localStorage.setItem(
    AUTH_KEY,
    JSON.stringify({
      uid: user.uid,
      username: user.username || "user"
    })
  );

}

/* ======================================
   GET USER
====================================== */
function getCurrentUser(){

  try{
    const raw = localStorage.getItem(AUTH_KEY);

    if(!raw) return null;

    const user = JSON.parse(raw);

    if(!user || !user.uid){
      localStorage.removeItem(AUTH_KEY);
      return null;
    }

    return user;

  }catch{
    localStorage.removeItem(AUTH_KEY);
    return null;
  }

}

/* ======================================
   LOGOUT
====================================== */
function logout(){

  localStorage.removeItem(AUTH_KEY);

  location.reload();

}

/* ======================================
   PI LOGIN
====================================== */
function loginWithPi(){

  const PiNetwork = window.Pi;

  if(!PiNetwork){
    alert("Pi SDK not ready");
    return;
  }

  PiNetwork.authenticate(
    ["username"],

    function onSuccess(auth){

      if(!auth?.user?.uid){
        alert("Login failed");
        return;
      }

      const user = {
        uid: auth.user.uid,
        username: auth.user.username
      };

      saveUser(user);

      console.log("✅ Logged in:", user);

      location.reload();

    },

    function onIncomplete(){
      alert("Login incomplete");
    },

    function onError(error){
      console.error(error);
      alert("Login error");
    }

  );

}

/* ======================================
   AUTO LOGIN (IMPORTANT)
====================================== */
async function initAuth(){

  const PiNetwork = window.Pi;

  if(!PiNetwork){
    console.warn("Pi SDK not loaded");
    return;
  }

  try{

    const scopes = ["username"];

    const auth = await PiNetwork.authenticate(scopes, true);

    if(auth?.user?.uid){

      const existing = getCurrentUser();

      /* UPDATE IF DIFFERENT */
      if(!existing || existing.uid !== auth.user.uid){

        saveUser({
          uid: auth.user.uid,
          username: auth.user.username
        });

        console.log("🔄 User synced");

      }

    }

  }catch(err){

    console.warn("Auto login skipped");

  }

}

/* ======================================
   REQUIRE LOGIN (OPTIONAL)
====================================== */
function requireAuth(){

  const user = getCurrentUser();

  if(!user){
    alert("Please login first");
    return false;
  }

  return true;

}

/* ======================================
   INIT
====================================== */

/* delay kadan don Pi SDK ya load */
setTimeout(()=>{
  initAuth();
}, 1000);
