/* ===============================
   ALBUKHR SETTINGS ENGINE (UNIFIED)
================================ */

const SETTINGS_KEY = "albukhr_user_settings_v1";

/* ===============================
   DEFAULT STRUCTURE
================================ */
function defaultSettings(){
  return {
    username: "",
    telegram: "",
    notifications: true,

    /* SECURITY */
    txLock: false,
    dailyLimit: 0,
    cooldownUntil: null,
    accountFrozen: false,

    /* 2FA */
    twoFA: false,
    otp: null,
    otpExpires: null,

    /* ENVIRONMENT */
    env: {
      mode: "test", // test | production
      maintenance: false,
      version: "1.0.0"
    }
  };
}

/* ===============================
   CORE
================================ */

function getSettings(){
  const data = JSON.parse(localStorage.getItem(SETTINGS_KEY));
  return data ? { ...defaultSettings(), ...data } : defaultSettings();
}

function saveSettings(data){
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
}

function updateUserSettings(partial){
  const s = getSettings();
  saveSettings({ ...s, ...partial });
}

/* ===============================
   SECURITY CONTROLS
================================ */

function setTxLock(state){
  const s = getSettings();
  s.txLock = !!state;
  saveSettings(s);
}

function freezeAccount(){
  const s = getSettings();
  s.accountFrozen = true;
  saveSettings(s);
}

function unfreezeAccount(){
  const s = getSettings();
  s.accountFrozen = false;
  saveSettings(s);
}

function canTransact(){
  const s = getSettings();

  if(s.accountFrozen) return false;
  if(s.txLock) return false;
  if(s.cooldownUntil && Date.now() < s.cooldownUntil) return false;

  return true;
}

/* ===============================
   2FA SYSTEM
================================ */

function toggle2FA(enable){
  const s = getSettings();
  s.twoFA = !!enable;
  saveSettings(s);
}

function is2FAEnabled(){
  return getSettings().twoFA === true;
}

function generateOTP(){
  const s = getSettings();

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  s.otp = otp;
  s.otpExpires = Date.now() + (5 * 60 * 1000); // 5 mins

  saveSettings(s);

  return otp;
}

function verifyOTP(input){
  const s = getSettings();

  if(!s.otp || !s.otpExpires) return false;
  if(Date.now() > s.otpExpires) return false;
  if(input !== s.otp) return false;

  s.otp = null;
  s.otpExpires = null;
  saveSettings(s);

  return true;
}
