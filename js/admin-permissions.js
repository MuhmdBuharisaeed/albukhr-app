// =======================================
// ALBUKHR ADMIN PERMISSIONS ENGINE v5
// Mainnet • Supabase
// =======================================

/* ===============================
CHECK SUPABASE
=============================== */

if(typeof supabaseClient==="undefined"){

throw new Error(
"supabase.js must load before admin-permissions.js"
);

}

/* ===============================
LOAD ROLE PERMISSIONS
=============================== */

async function getRolePermissions(){

const admin =
await getCurrentAdminSession();

if(!admin){

return [];

}

const {

data,
error

} =
await supabaseClient
.from("admin_permissions")
.select("*")
.eq(
"role",
admin.role
)
.eq(
"status",
"active"
);

if(error){

console.error(error);

return [];

}

return data || [];

}

/* ===============================
HAS PERMISSION
=============================== */

async function hasPermission(
permission
){

const permissions =
await getRolePermissions();

if(!permissions.length){

return false;

}

/* SUPER ADMIN */

if(

permissions.some(
p=>p.permission==="*"
)

){

return true;

}

/* SPECIFIC */

return permissions.some(
p=>p.permission===permission
);

/* ===============================
REQUIRE PERMISSION
=============================== */

async function requirePermission(
permission
){

const logged =
await isAdminLoggedIn();

if(!logged){

window.location.href =
"admin-login.html";

return false;

}

const allowed =
await hasPermission(
permission
);

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

/* ===============================
REQUIRE ROLE
=============================== */

async function requireRole(
roles
){

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

alert(
"Access denied."
);

window.location.href =
"unified-admin-buttons.html";

return false;

}

return true;

}

/* ===============================
LOAD PAGE PERMISSIONS
=============================== */

async function loadAdminPermissions(){

const admin =
await getCurrentAdminSession();

if(!admin){

return;

}

const {

data,
error

} =
await supabaseClient
.from("admin_permissions")
.select("*")
.eq(
"role",
admin.role
)
.eq(
"status",
"active"
);

if(error){

console.error(error);

return;

}

document
.querySelectorAll(
".admin-btn"
)
.forEach(btn=>{

btn.style.display =
"none";

});

(data||[])
.forEach(item=>{

const btn =
document.querySelector(

`button[onclick="go('${item.page}')"]`

);

if(btn){

btn.style.display =
"block";

}

});

}

/* ===============================
HIDE BUTTON
=============================== */

function hideButton(
page
){

const btn =
document.querySelector(

`button[onclick="go('${page}')"]`

);

if(btn){

btn.style.display =
"none";

}

}
