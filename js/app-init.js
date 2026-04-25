// =======================================
// GLOBAL APP INITIALIZER
// =======================================

window.addEventListener("DOMContentLoaded", async ()=>{

  try{

    // ✅ STEP 1: INIT PI
    initPi();

    // ✅ STEP 2: AUTH
    const user = await ensurePiAuth();

    if(!user){
      console.error("❌ User not authenticated");
      return;
    }

    // ✅ STEP 3: SET GLOBAL USER
    window.CURRENT_USER = user;

    // ✅ STEP 4: UPDATE UI
    if(typeof updateUserUI === "function"){
      updateUserUI();
    }

    // ✅ STEP 5: AUTO PAGE LOAD
    const page = document.body.dataset.page;

    if(page === "home" && typeof loadHome === "function"){
      loadHome();
    }

    if(page === "project" && typeof loadProject === "function"){
      loadProject();
    }

  }catch(e){
    console.error("❌ APP INIT ERROR:", e);
  }

});
