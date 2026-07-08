// =======================================
// ALBUKHR ADMIN LOGIN ENGINE v3
// Mainnet • Supabase
// =======================================

const SUPABASE_URL =
"https://qexmnghilahsvethlxem.supabase.co";

const SUPABASE_KEY =
"sb_publishable_mSbWlhVKdmSjasKJC50QYw_5wzgRMe2";

const supabase =
window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const SESSION_DURATION =
2 * 60 * 60 * 1000;

/* ======================================
   ADMIN LOGIN
====================================== */

async function adminLogin(
  username,
  password
){

  try{

    /* FIND ADMIN */

    const { data: admin, error } =
      await supabase
      .from("admin_users")
      .select("*")
      .eq("username", username)
      .eq("password", password)
      .eq("status","active")
      .single();

    if(error || !admin){

      return {
        success:false,
        error:"Invalid username or password"
      };

    }

    /* CREATE TOKEN */

    const token =
      crypto.randomUUID();

    const now =
      new Date();

    const expires =
      new Date(
        now.getTime() +
        SESSION_DURATION
      );

    /* SAVE SESSION */

    const {
      error: sessionError
    } =
    await supabase
    .from("admin_sessions")
    .insert({

      admin_username:
        admin.username,

      admin_role:
        admin.role,

      session_token:
        token,

      login_time:
        now.toISOString(),

      expires_at:
        expires.toISOString(),

      last_activity:
        now.toISOString(),

      status:"active"

    });

    if(sessionError){

      return {
        success:false,
        error:sessionError.message
      };

    }

    /* UPDATE LAST LOGIN */

    await supabase
    .from("admin_users")
    .update({

      last_login:
        now.toISOString()

    })
    .eq("id", admin.id);

    /* SAVE LOCAL */

    localStorage.setItem(
      "albukhr_admin_token",
      token
    );

    localStorage.setItem(
      "albukhr_admin_username",
      admin.username
    );

    localStorage.setItem(
      "albukhr_admin_role",
      admin.role
    );

    return{

      success:true,

      username:
        admin.username,

      role:
        admin.role

    };

  }catch(err){

    console.error(err);

    return{

      success:false,

      error:
        err.message

    };

  }

}
