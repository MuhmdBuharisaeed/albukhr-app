// =======================================
// ALBUKHR ADMIN SESSION ENGINE v5
// Mainnet • Supabase
// =======================================

const ADMIN_SESSION_KEY =
"albukhr_admin_token";

/* ===============================
CHECK SUPABASE
=============================== */

if(typeof supabaseClient === "undefined"){

throw new Error(
"supabase.js must load before admin-session.js"
);

}

/* ===============================
GET CURRENT TOKEN
=============================== */

function getAdminToken(){

return localStorage.getItem(
ADMIN_SESSION_KEY
);

}

/* ===============================
GET ACTIVE SESSION
=============================== */

async function getCurrentAdminSession(){

const token =
getAdminToken();

if(!token){

return null;

}

const {

data:session,
error

} =
await supabaseClient
.from("admin_sessions")
.select("*")
.eq(
"session_token",
token
)
.eq(
"status",
"active"
)
.maybeSingle();

if(error){

console.error(error);

clearAdminSession();

return null;

}

if(!session){

clearAdminSession();

return null;

}

const now =
Date.now();

const expires =
new Date(
session.expires_at
).getTime();

if(now >= expires){

await supabaseClient
.from("admin_sessions")
.update({

status:"expired"

})
.eq(
"id",
session.id
);

clearAdminSession();

return null;

}

/* ===============================
REFRESH LAST ACTIVITY
=============================== */

await supabaseClient
.from("admin_sessions")
.update({

last_activity:
new Date().toISOString()

})
.eq(
"id",
session.id
);

/* ===============================
RETURN SESSION
=============================== */

return{

id:
session.id,

username:
session.admin_username,

role:
session.admin_role,

token:
session.session_token,

loginTime:
session.login_time,

expiresAt:
session.expires_at

};

}

/* ===============================
GET ADMIN
=============================== */

async function getAdmin(){

return await
getCurrentAdminSession();

}

/* ===============================
IS LOGGED IN
=============================== */

async function isAdminLoggedIn(){

const admin =
await getCurrentAdminSession();

return admin !== null;

}

/* ===============================
GET ROLE
=============================== */

async function getAdminRole(){

const admin =
await getCurrentAdminSession();

return admin
? admin.role
: null;

}

/* ===============================
CLEAR LOCAL SESSION
=============================== */

function clearAdminSession(){

localStorage.removeItem(
ADMIN_SESSION_KEY
);

localStorage.removeItem(
"albukhr_admin_username"
);

localStorage.removeItem(
"albukhr_admin_role"
);

}

/* ===============================
SESSION EXPIRED
=============================== */

async function destroyAdminSession(){

const token =
getAdminToken();

if(token){

await supabaseClient
.from("admin_sessions")
.update({

status:"expired"

})
.eq(
"session_token",
token
);

}

clearAdminSession();

   }
