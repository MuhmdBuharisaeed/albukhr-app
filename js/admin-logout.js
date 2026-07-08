// =======================================
// ALBUKHR ADMIN LOGOUT ENGINE v5
// Mainnet • Supabase
// =======================================

/* ===============================
CHECK SUPABASE
=============================== */

if(typeof supabaseClient==="undefined"){

throw new Error(
"supabase.js must load before admin-logout.js"
);

}

/* ===============================
ADMIN LOGOUT
=============================== */

async function adminLogout(){

try{

const admin =
await getCurrentAdminSession();

const token =
localStorage.getItem(
"albukhr_admin_token"
);

if(admin && token){

/* Close Session */

await supabaseClient
.from("admin_sessions")
.update({

status:"logged_out",

last_activity:
new Date().toISOString()

})
.eq(
"session_token",
token
);

/* Write Log */

await supabaseClient
.from("admin_logs")
.insert({

admin_username:
admin.username,

admin_role:
admin.role,

action:"logout",

description:
"Administrator logged out.",

created_at:
new Date().toISOString()

});

}

/* Clear Local */

clearAdminSession();

/* Redirect */

window.location.replace(
"admin-login.html"
);

}catch(err){

console.error(err);

/* Force Clear */

clearAdminSession();

window.location.replace(
"admin-login.html"
);

}

}

/* ===============================
FORCE LOGOUT
=============================== */

function forceAdminLogout(){

clearAdminSession();

window.location.replace(
"admin-login.html"
);
   }
