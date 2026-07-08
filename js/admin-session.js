// =======================================
// ALBUKHR ADMIN SESSION ENGINE v3
// Mainnet • Supabase
// =======================================

const ADMIN_SESSION_KEY =
"albukhr_admin_token";

/* ======================================
   GET ACTIVE SESSION
====================================== */

async function getAdmin(){

  const token =
    localStorage.getItem(
      ADMIN_SESSION_KEY
    );

  if(!token){
    return null;
  }

  try{

    const { data, error } =
      await supabase
      .from("admin_sessions")
      .select("*")
      .eq("session_token", token)
      .eq("status", "active")
      .maybeSingle();

    if(error || !data){

      clearAdminSession();

      return null;

    }

    const now = Date.now();

    const expires =
      new Date(
        data.expires_at
      ).getTime();

    if(now >= expires){

      await supabase
      .from("admin_sessions")
      .update({
        status:"expired"
      })
      .eq("id", data.id);

      clearAdminSession();

      return null;

    }

    /* Refresh activity */

    await supabase
      .from("admin_sessions")
      .update({
        last_activity:
          new Date().toISOString()
      })
      .eq("id", data.id);

    return data;

  }catch(e){

    console.error(e);

    clearAdminSession();

    return null;

  }

}

/* ======================================
   IS LOGGED IN
====================================== */

async function isAdminLoggedIn(){

  const session =
    await getAdmin();

  return !!session;

}

/* ======================================
   GET ROLE
====================================== */

async function getAdminRole(){

  const session =
    await getAdmin();

  return session
    ? session.admin_role
    : null;

}

/* ======================================
   CLEAR SESSION
====================================== */

function clearAdminSession(){

  localStorage.removeItem(
    "albukhr_admin_token"
  );

  localStorage.removeItem(
    "albukhr_admin_username"
  );

  localStorage.removeItem(
    "albukhr_admin_role"
  );

}
