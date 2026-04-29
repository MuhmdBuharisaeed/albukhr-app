// =======================================
// GLOBAL APP INITIALIZER (PRO)
// =======================================

window.addEventListener("DOMContentLoaded", async ()=>{

  try{

    /* ===============================
       STEP 1: INIT PI SAFELY
    =============================== */
    if(window.Pi){
      const ok = initPi();
      if(!ok){
        console.error("❌ Pi failed to init");
        return;
      }
    }else{
      console.error("❌ Pi SDK missing");
      return;
    }

    /* ===============================
       STEP 2: AUTH
    =============================== */
    const user = await ensurePiAuth();

    if(!user){
      console.warn("⚠️ Redirecting to login...");
      window.location.href = "login.html";
      return;
    }

    /* ===============================
       STEP 3: SET GLOBAL USER
    =============================== */
    window.CURRENT_USER = user;

    /* ===============================
       STEP 4: UPDATE UI
    =============================== */
    if(typeof updateUserUI === "function"){
      updateUserUI();
    }

    /* ===============================
       STEP 5: PAGE ROUTING
    =============================== */
    const page = document.body.dataset.page;

    if(page === "home" && typeof loadHome === "function"){
      await loadHome(); // ✅ safer
    }

    if(page === "project" && typeof loadProject === "function"){
      await loadProject();
    }

  }catch(e){
    console.error("❌ APP INIT ERROR:", e);
  }

});
