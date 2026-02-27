/* ===============================
   ALBUKHR SECURITY CORE v2
   Unified Wallet + Ecosystem Guard
================================ */

const SETTINGS_KEY = "albukhr_user_settings_v2";

/* ===============================
   DEFAULT STRUCTURE
================================ */

function defaultSettings(){
  return {
    username: "",
    telegram: "",
    notifications: true,

    /* SECURITY CORE */
    txLock: false,
    dailyLimit: 0,
    cooldownUntil: null,
    accountFrozen: false,

    /* 2FA */
    twoFA: false,
    otp: null,
    otpExpires: null
  };
}

/* ===============================
   CORE STORAGE
================================ */

function getSettings(){
  try{
    const data = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    return data ? { ...defaultSettings(), ...data } : defaultSettings();
  }catch{
    return defaultSettings();
  }
}

function saveSettings(data){
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
}

function updateUserSettings(partial){
  const s = getSettings();
  saveSettings({ ...s, ...partial });
}

/* ===============================
   SECURITY GUARD
================================ */

function isAccountFrozen(){
  return getSettings().accountFrozen === true;
}

function isTxLocked(){
  return getSettings().txLock === true;
}

function isCooldownActive(){
  const s = getSettings();
  if(!s.cooldownUntil) return false;
  return Date.now() < s.cooldownUntil;
}

function canTransact(){

  if(isAccountFrozen()) return false;
  if(isTxLocked()) return false;
  if(isCooldownActive()) return false;

  return true;
}

/* ===============================
   FREEZE CONTROLS
================================ */

function freezeAccount(){
  updateUserSettings({ accountFrozen:true });
}

function unfreezeAccount(){
  updateUserSettings({ accountFrozen:false });
}

function setTxLock(state){
  updateUserSettings({ txLock: !!state });
}

function setCooldown(minutes){
  updateUserSettings({
    cooldownUntil: Date.now() + (minutes * 60000)
  });
}

/* ===============================
   2FA SYSTEM
================================ */

function toggle2FA(enable){
  updateUserSettings({ twoFA: !!enable });
}

function is2FAEnabled(){
  return getSettings().twoFA === true;
}

function generateOTP(){

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  updateUserSettings({
    otp,
    otpExpires: Date.now() + (5 * 60 * 1000)
  });

  return otp;
}

function verifyOTP(input){

  const s = getSettings();

  if(!s.otp || !s.otpExpires) return false;
  if(Date.now() > s.otpExpires) return false;
  if(input !== s.otp) return false;

  updateUserSettings({
    otp:null,
    otpExpires:null
  });

  return true;
}
