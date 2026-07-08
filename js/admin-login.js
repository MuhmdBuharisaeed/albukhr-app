// =======================================
// ALBUKHR ADMIN LOGIN ENGINE v5
// Mainnet • Supabase
// =======================================

const ADMIN_SESSION_KEY =
"albukhr_admin_token";

const SESSION_DURATION =
2 * 60 * 60 * 1000;

/* ===============================
CHECK SUPABASE
=============================== */

if(typeof supabaseClient === "undefined"){

throw new Error(
"supabase.js must load before admin-login.js"
);

}

/* ===============================
CREATE SESSION TOKEN
=============================== */

function createSessionToken(){

return (

Date.now().toString(36) +

Math.random()
.toString(36)
.substring(2,10) +

Math.random()
.toString(36)
.substring(2,10)

);

}

/* ===============================
ADMIN LOGIN
=============================== */

async function adminLogin(

username,
password

){

try{

console.log(
"Starting admin login..."
);

const {

data:admins,
error

} =
await supabaseClient
.from("admin_users")
.select("*")
.eq("status","active");

if(error){

console.error(error);

return{

success:false,
error:error.message

};

}

if(!admins?.length){

return{

success:false,
error:"No active administrators found."

};

}

const admin =
admins.find(a=>

a.username === username &&
a.password === password

);

if(!admin){

return{

success:false,
error:"Invalid username or password."

};

}

const token =
createSessionToken();

const now =
new Date();

const expires =
new Date(

now.getTime() +
SESSION_DURATION

);

/* ===============================
CREATE SESSION
=============================== */

const {

error:sessionError

} =
await supabaseClient
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

console.error(sessionError);

return{

success:false,
error:
sessionError.message

};

}

/* ===============================
UPDATE LAST LOGIN
=============================== */

await supabaseClient
.from("admin_users")
.update({

last_login:
now.toISOString()

})
.eq("id",admin.id);

/* ===============================
WRITE ADMIN LOG
=============================== */

await supabaseClient
.from("admin_logs")
.insert({

admin_username:
admin.username,

admin_role:
admin.role,

action:"login",

description:
"Administrator logged in.",

created_at:
now.toISOString()

});

/* ===============================
SAVE LOCAL SESSION
=============================== */

localStorage.setItem(

ADMIN_SESSION_KEY,

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

/* ===============================
LOGIN SUCCESS
=============================== */

console.log(

"Admin login successful."

);

return{

success:true,

token,

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
err.message ||
"Unexpected login error."

};

}

}
