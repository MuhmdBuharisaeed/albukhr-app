// =======================================
// ALBUKHR ADMIN GUARD ENGINE v5
// Mainnet • Supabase
// =======================================

/* ===============================
CHECK SUPABASE
=============================== */

if(typeof supabaseClient==="undefined"){

throw new Error(
"supabase.js must load before admin-guard.js"
);

}

/* ===============================
PROTECT PAGE
=============================== */

async function protectAdminPage(){

const admin =
await getCurrentAdminSession();

if(!admin){

window.location.replace(
"admin-login.html"
);

return false;

}

return admin;

}

/* ===============================
REQUIRE ROLE
=============================== */

async function requireAdminRole(
roles
){

const admin =
await protectAdminPage();

if(!admin){

return false;

}

if(
!roles.includes(admin.role)
){

alert(
"Access denied."
);

window.location.replace(
"unified-admin-buttons.html"
);

return false;

}

return admin;

}

/* ===============================
REQUIRE PERMISSION
=============================== */

async function requireAdminPermission(
permission
){

const admin =
await protectAdminPage();

if(!admin){

return false;

}

const allowed =
await hasPermission(
permission
);

if(!allowed){

alert(
"You do not have permission."
);

window.location.replace(
"unified-admin-buttons.html"
);

return false;

}

return admin;

}

/* ===============================
AUTO START
=============================== */

document.addEventListener(
"DOMContentLoaded",
()=>{

protectAdminPage();

});
