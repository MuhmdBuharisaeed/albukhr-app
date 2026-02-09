/* ===============================
   ALBUKHR SETTINGS ENGINE
================================ */

const SETTINGS_KEY = "albukhr_user_settings_v1";

function getSettings(){
  return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {
    username: "",
    telegram: "",
    notifications: true,
    txLock: false,
    dailyLimit: 0,
    cooldownUntil: null,
    accountFrozen: false,
    env: {
      mode: "test",
      maintenance: false,
      version: "1.0.0"
    }
  };
}

function saveSettings(data){
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
}

/* USER */
function updateUserSettings(partial){
  const s = getSettings();
  saveSettings({ ...s, ...partial });
}

/* SECURITY */
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

/* READ-ONLY CHECKS */
function canTransact(){
  const s = getSettings();
  if(s.accountFrozen) return false;
  if(s.txLock) return false;
  if(s.cooldownUntil && Date.now() < s.cooldownUntil) return false;
  return true;
}
