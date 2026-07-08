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

async function adminLogin(username,password){

const { data, error } =
await supabase
.from("admin_users")
.select("*")
.eq("username", username)
.eq("password", password)
.eq("status","active")
.single();

if(error || !data){

return {
success:false,
error:"Invalid username or password"
};

}

const token =
crypto.randomUUID();

const expiresAt =
new Date(
Date.now() + SESSION_DURATION
).toISOString();

const { error: sessionError } =
await supabase
.from("admin_sessions")
.insert({

admin_username:data.username,

admin_role:data.role,

session_token:token,

expires_at:expiresAt,

status:"active"

});

if(sessionError){

return {
success:false,
error:sessionError.message
};

}

await supabase
.from("admin_logs")
.insert({

admin_username:data.username,

admin_role:data.role,

action:"login",

status:"success"

});

localStorage.setItem(
"albukhr_admin_token",
token
);

localStorage.setItem(
"albukhr_admin_username",
data.username
);

localStorage.setItem(
"albukhr_admin_role",
data.role
);

return {

success:true,

role:data.role,

username:data.username

};

}
