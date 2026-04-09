/* ===============================
   ALBUKHR SECURITY CORE
================================ */

const SECURITY_KEY = "albukhr_security_settings";
const PIN_KEY = "albukhr_wallet_pin";
const LOCK_KEY = "albukhr_wallet_locked";

function getSecurity(){
  return JSON.parse(localStorage.getItem(SECURITY_KEY) || "{}");
}

function setSecurity(data){
  localStorage.setItem(SECURITY_KEY, JSON.stringify(data));
}

/* ===============================
   PIN (2FA)
================================ */

function hashPin(pin){
  return btoa(pin); // simple encoding (can upgrade later)
}

function enable2FA(){
  const pin = prompt("Create 6-digit PIN");
  if(!pin || pin.length < 4){
    alert("Invalid PIN");
    return;
  }

  localStorage.setItem(PIN_KEY, hashPin(pin));
  setSecurity({...getSecurity(), twofa:true});
  alert("2FA Enabled");
}

function verifyPin(){
  const saved = localStorage.getItem(PIN_KEY);
  if(!saved) return true;

  const input = prompt("Enter Wallet PIN");
  return hashPin(input) === saved;
}

/* ===============================
   LOCK SYSTEM
================================ */

function lockWallet(){
  localStorage.setItem(LOCK_KEY,"true");
}

function unlockWallet(){
  if(verifyPin()){
    localStorage.setItem(LOCK_KEY,"false");
    return true;
  }
  alert("Wrong PIN");
  return false;
}

function isLocked(){
  return localStorage.getItem(LOCK_KEY)==="true";
}

/* ===============================
   AUTO LOCK
================================ */

let inactivityTimer;

function startAutoLock(){

const security = getSecurity();

/* Only lock if 2FA enabled */

if(!security.twofa) return;

clearTimeout(inactivityTimer);

inactivityTimer = setTimeout(()=>{

lockWallet();

alert("Wallet Locked");

},120000);

}

document.addEventListener("click", startAutoLock);
document.addEventListener("keydown", startAutoLock);

/* ===============================
   ENCRYPTION (Basic)
================================ */

function encryptData(data){
  if(!getSecurity().encrypt) return data;
  return btoa(JSON.stringify(data));
}

function decryptData(data){
  if(!getSecurity().encrypt) return data;
  return JSON.parse(atob(data));
}

function startAutoLock(){

const security = getSecurity();

if(!security.twofa) return;

clearTimeout(inactivityTimer);

inactivityTimer = setTimeout(()=>{

lockWallet();

/* Optional silent lock */

console.log("Wallet Auto Locked");

},120000);

}

document.addEventListener("click",()=>{

if(isLocked()){

unlockWallet();

}

startAutoLock();

});
