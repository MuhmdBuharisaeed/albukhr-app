// =======================================
// ALBUKHR ADMIN LOGOUT ENGINE v3
// Mainnet • Supabase
// =======================================

/* ======================================
   LOGOUT
====================================== */

async function adminLogout(){

  try{

    const token =
      localStorage.getItem(
        "albukhr_admin_token"
      );

    const username =
      localStorage.getItem(
        "albukhr_admin_username"
      );

    const role =
      localStorage.getItem(
        "albukhr_admin_role"
      );

    if(token){

      /* CLOSE SESSION */

      await supabase
      .from("admin_sessions")
      .update({

        status:"closed",

        last_activity:
          new Date().toISOString()

      })
      .eq("session_token", token);

    }

    /* SAVE LOG */

    if(username && role){

      await supabase
      .from("admin_logs")
      .insert({

        admin_username:
          username,

        admin_role:
          role,

        action:"logout",

        status:"success"

      });

    }

  }catch(e){

    console.error(e);

  }

  /* CLEAR LOCAL STORAGE */

  localStorage.removeItem(
    "albukhr_admin_token"
  );

  localStorage.removeItem(
    "albukhr_admin_username"
  );

  localStorage.removeItem(
    "albukhr_admin_role"
  );

  /* REDIRECT */

  window.location.href =
    "admin-login.html";

}

/* ======================================
   FORCE LOGOUT
====================================== */

function forceAdminLogout(){

  localStorage.removeItem(
    "albukhr_admin_token"
  );

  localStorage.removeItem(
    "albukhr_admin_username"
  );

  localStorage.removeItem(
    "albukhr_admin_role"
  );

  window.location.href =
    "admin-login.html";

}
