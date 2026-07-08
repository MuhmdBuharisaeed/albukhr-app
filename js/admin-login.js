// =======================================
// ALBUKHR ADMIN LOGIN ENGINE v4
// Mainnet • Supabase • Pi Browser Safe
// =======================================

const SUPABASE_URL =
"https://qexmnghilahsvethlxem.supabase.co";

const SUPABASE_KEY =
"sb_publishable_mSbWlhVKdmSjasKJC50QYw_5wzgRMe2";

const supabaseClient =
window.supabase.createClient(
SUPABASE_URL,
SUPABASE_KEY
);

window.supabaseClient =
supabaseClient;

const SESSION_DURATION =
2 * 60 * 60 * 1000;

/* ===============================
CREATE TOKEN
=============================== */

function createSessionToken(){

return (
Date.now().toString(36) +
Math.random()
.toString(36)
.substring(2) +
Math.random()
.toString(36)
.substring(2)
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

const {
data:admin,
error:adminError
} =
await supabaseClient
.from("admin_users")
.select("*")
.eq("username",username)
.eq("password",password)
.eq("status","active")
.single();

if(adminError){

console.error(adminError);

return{
success:false,
error:adminError.message
};

}

if(!admin){

return{
success:false,
error:"Invalid username or password"
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
SAVE SESSION
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
error:sessionError.message
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
SAVE LOCAL SESSION
=============================== */

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

/* ===============================
RETURN SUCCESS
=============================== */

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
"Unexpected login error"

};

}

}

/* ===============================
AUTO LOGOUT
=============================== */

async function adminLogout(){

const token =
localStorage.getItem(
"albukhr_admin_token"
);

if(token){

await supabaseClient
.from("admin_sessions")
.update({
status:"logged_out"
})
.eq(
"session_token",
token
);

}

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
