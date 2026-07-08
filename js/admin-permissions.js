// =======================================
// ALBUKHR ADMIN PERMISSIONS ENGINE v3
// Mainnet • Supabase
// =======================================

/* ======================================
   HAS PERMISSION
====================================== */

async function hasPermission(permission){

  const role =
    localStorage.getItem(
      "albukhr_admin_role"
    );

  if(!role){
    return false;
  }

  try{

    const { data, error } =
      await supabase
      .from("admin_permissions")
      .select("*")
      .eq("role", role);

    if(error){
      console.error(error);
      return false;
    }

    if(!Array.isArray(data)){
      return false;
    }

    /* Super Admin */

    if(
      data.some(
        p => p.permission === "*"
      )
    ){
      return true;
    }

    /* Specific Permission */

    return data.some(
      p => p.permission === permission
    );

  }catch(e){

    console.error(e);

    return false;

  }

}

/* ======================================
   REQUIRE PERMISSION
====================================== */

async function requirePermission(permission){

  const logged =
    await isAdminLoggedIn();

  if(!logged){

    alert("Admin login required");

    window.location.href =
      "admin-login.html";

    return false;

  }

  const allowed =
    await hasPermission(permission);

  if(!allowed){

    alert(
      "You do not have permission to access this page."
    );

    window.location.href =
      "unified-admin-buttons.html";

    return false;

  }

  return true;

}

/* ======================================
   REQUIRE ROLE
====================================== */

async function requireRole(roles){

  const role =
    await getAdminRole();

  if(!role){

    window.location.href =
      "admin-login.html";

    return false;

  }

  if(
    !roles.includes(role)
  ){

    alert("Access denied");

    window.location.href =
      "unified-admin-buttons.html";

    return false;

  }

  return true;

}
