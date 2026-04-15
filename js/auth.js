/* =====================================
   ALBUKHR AUTH SYSTEM v1 (Pi + Local)
===================================== */

const AUTH_KEY = "albukhr_auth";

/* ===============================
   GET CURRENT USER
=============================== */
function getCurrentUser(){

  try{
    return JSON.parse(localStorage.getItem(AUTH_KEY));
  }catch{
    return null;
  }

}

/* ===============================
   IS LOGGED IN
=============================== */
function isLoggedIn(){
  return !!getCurrentUser();
}

/* ===============================
   LOGIN WITH PI
=============================== */
async function loginWithPi(){

  try{

    const user = await Pi.authenticate(
      ['username','payments'],
      function(payment){
        console.log("Payment:", payment);
      }
    );

    const authData = {
      uid: user.uid,
      username: user.username,
      accessToken: user.accessToken,
      loginTime: Date.now()
    };

    localStorage.setItem(
      AUTH_KEY,
      JSON.stringify(authData)
    );

    console.log("Login success:", authData);

    window.dispatchEvent(
      new CustomEvent("authChanged")
    );

    return {success:true, user:authData};

  }catch(err){

    console.error("Login failed", err);

    return {success:false, error:"Pi login failed"};
  }

}

/* ===============================
   LOGOUT
=============================== */
function logout(){

  localStorage.removeItem(AUTH_KEY);

  window.dispatchEvent(
    new CustomEvent("authChanged")
  );

}

/* ===============================
   REQUIRE AUTH (GUARD)
=============================== */
function requireAuth(){

  if(!isLoggedIn()){

    alert("Please login first");

    window.location.href = "index.html";

    return false;
  }

  return true;
}
