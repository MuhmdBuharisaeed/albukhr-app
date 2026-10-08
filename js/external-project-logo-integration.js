/* ALBUKHR EXTERNAL PROJECT LOGO INTEGRATION
 * Purpose:
 * - Add the External Project logo lifecycle without modifying the active
 *   external-project-detail.js engine.
 * - Mainnet upload/read uses the trusted External Project API.
 * - Testnet remains untouched while its trusted logo gateway is not provisioned.
 * - Submission remains gated in the UI until a valid Mainnet logo exists.
 */
(function(window, document){
"use strict";

const state={
  applicationId:null,
  network:null,
  application:null,
  editable:false,
  logo:null,
  bound:false,
  loading:false,
  uploading:false
};

const $=id=>document.getElementById(id);

function norm(v){
  return String(v||"draft").trim().toLowerCase().replace(/\s+/g,"_");
}

function isEditable(v){
  return ["draft","needs_revision"].includes(norm(v));
}

function status(message,type){
  const element=$("externalProjectLogoStatus");
  if(!element)return;
  element.textContent=String(message||"");
  element.className="form-status"+(type?" "+type:"");
}

function allowedMime(file){
  const type=String(file?.type||"").trim().toLowerCase();
  if(type==="image/png"||type==="image/jpeg")return type;

  const name=String(file?.name||"").toLowerCase();
  if(name.endsWith(".png"))return "image/png";
  if(name.endsWith(".jpg")||name.endsWith(".jpeg"))return "image/jpeg";

  return "";
}

function inspectLogo(file){
  return new Promise((resolve,reject)=>{
    if(!file)return reject(new Error("Select a project logo first."));
    if(file.size<=0)return reject(new Error("The selected project logo is empty."));
    if(file.size>1048576)return reject(new Error("Project logo must be no larger than 1 MB."));

    const mime=allowedMime(file);
    if(!mime)return reject(new Error("Project logo must be PNG or JPG/JPEG only."));

    const url=URL.createObjectURL(file);
    const image=new Image();

    image.onload=()=>{
      const width=Number(image.naturalWidth||image.width||0);
      const height=Number(image.naturalHeight||image.height||0);
      URL.revokeObjectURL(url);

      if(width<400||height<400){
        reject(new Error("Project logo must be at least 400 × 400 pixels."));
        return;
      }

      resolve({mime,width,height});
    };

    image.onerror=()=>{
      URL.revokeObjectURL(url);
      reject(new Error("The selected project logo could not be read as a valid image."));
    };

    image.src=url;
  });
}

function setLogo(value){
  const row=value||{};
  state.logo={
    logo_url:row.logo_url||null,
    logo_path:row.logo_path||null,
    logo_width:row.logo_width??null,
    logo_height:row.logo_height??null,
    logo_format:row.logo_format||null,
    logo_size_bytes:row.logo_size_bytes??null
  };

  render();
  gateSubmit();
}

function hasValidLogo(){
  const logo=state.logo||{};
  return !!(
    logo.logo_url &&
    Number(logo.logo_width)>=400 &&
    Number(logo.logo_height)>=400 &&
    ["png","jpg","jpeg"].includes(String(logo.logo_format||"").toLowerCase()) &&
    Number(logo.logo_size_bytes)>0 &&
    Number(logo.logo_size_bytes)<=1048576
  );
}

function renderPreview(file){
  const image=$("externalProjectLogoImage");
  const empty=$("externalProjectLogoEmpty");
  if(!image)return;

  if(file){
    const url=URL.createObjectURL(file);
    image.src=url;
    image.hidden=false;
    if(empty)empty.hidden=true;
    image.onload=()=>URL.revokeObjectURL(url);
    return;
  }

  const url=state.logo?.logo_url ? state.logo.logo_url + (state.logo.logo_url.includes("?") ? "&" : "?") + "v=" + Date.now() : "";

  if(url){
    image.src=url;
    image.hidden=false;
    if(empty)empty.hidden=true;
  }else{
    image.removeAttribute("src");
    image.hidden=true;
    if(empty)empty.hidden=false;
  }
}

function render(){
  const form=$("externalProjectLogoForm");
  const readonly=$("externalProjectLogoReadonlyNote");
  const uploadButton=$("externalProjectLogoUploadButton");

  const mainnet=state.network==="mainnet";
  const canEdit=mainnet&&state.editable;

  if(form)form.hidden=!canEdit;
  if(readonly)readonly.hidden=canEdit;
  if(uploadButton)uploadButton.disabled=!canEdit||state.uploading;

  if(state.network==="testnet"){
    status("Mainnet External Project logo lifecycle is not enabled on Testnet yet.","info");
    renderPreview(null);
    return;
  }

  if(hasValidLogo()){
    status(
      "Logo registered: "+state.logo.logo_width+" × "+state.logo.logo_height+
      " px • "+String(state.logo.logo_format||"").toUpperCase()+
      " • "+Math.round(Number(state.logo.logo_size_bytes)/1024)+" KB.",
      "success"
    );
  }else if(canEdit){
    status("A valid project logo is required before this application can be submitted.","error");
  }else{
    status("No valid project logo is registered for this application.","error");
  }

  renderPreview(null);
}

function gateSubmit(){
  const button=$("submitApplicationButton");
  if(!button)return;

  const canEdit=state.network==="mainnet"&&state.editable;
  if(!canEdit){
    button.disabled=false;
    button.removeAttribute("data-logo-required");
    return;
  }

  const ready=hasValidLogo();
  button.disabled=!ready;

  if(ready){
    button.removeAttribute("data-logo-required");
  }else{
    button.dataset.logoRequired="true";
  }
}

async function loadLogo(){
  if(state.network!=="mainnet")return;

  try{
    const data=await window.ALBukhrExternalProjectApi.getLogo(state.applicationId);
    const row=Array.isArray(data)?data[0]:data;
    setLogo(row||{});
  }catch(error){
    console.warn("[ALBUKHR EXTERNAL PROJECT LOGO] Logo load failed:",error);
    setLogo(state.application?.logo_url?state.application:{});
    status("Unable to read the current project logo from the trusted gateway.","error");
    gateSubmit();
  }
}

async function upload(){
  if(state.uploading)return;

  if(state.network!=="mainnet"){
    status("Secure External Project logo upload is currently available on MAINNET only.","error");
    return;
  }

  if(!state.editable){
    status("Project logo can only be changed while the application is a draft or needs revision.","error");
    return;
  }

  const file=$("externalProjectLogoFile")?.files?.[0]||null;

  try{
    await inspectLogo(file);
  }catch(error){
    status(error?.message||"Invalid project logo.","error");
    return;
  }

  state.uploading=true;

  const button=$("externalProjectLogoUploadButton");
  if(button){
    button.disabled=true;
    button.textContent="Uploading...";
  }

  try{
    status("Uploading and registering project logo securely.","loading");

    const result=await window.ALBukhrExternalProjectApi.uploadLogo(
      state.applicationId,
      file
    );

    setLogo(result||{});
    status("Project logo uploaded and registered successfully.","success");

    const input=$("externalProjectLogoFile");
    if(input)input.value="";
  }catch(error){
    console.error("[ALBUKHR EXTERNAL PROJECT LOGO] Upload failed:",error);
    status(error?.message||"Project logo upload failed.","error");
  }finally{
    state.uploading=false;

    if(button){
      button.disabled=!state.editable;
      button.textContent="Upload / Replace Logo";
    }

    gateSubmit();
  }
}

function bind(){
  if(state.bound)return;

  const form=$("externalProjectLogoForm");

  if(form){
    state.bound=true;

    form.addEventListener("submit",event=>{
      event.preventDefault();
      upload();
    });
  }

  $("externalProjectLogoFile")?.addEventListener("change",async()=>{
    const file=$("externalProjectLogoFile")?.files?.[0]||null;

    if(!file){
      renderPreview(null);
      render();
      return;
    }

    renderPreview(file);

    try{
      const result=await inspectLogo(file);
      status(
        "Selected logo: "+result.width+" × "+result.height+
        " px • "+result.mime.toUpperCase().replace("IMAGE/","")+
        ". Click Upload / Replace Logo to register it.",
        "success"
      );
    }catch(error){
      status(error?.message||"Invalid project logo.","error");
    }
  });
}

async function init(context){
  const application=context?.application||{};

  state.applicationId=
    context?.applicationId||
    application.id||
    state.applicationId;

  state.network=
    String(context?.network||application.network||state.network||"")
      .trim()
      .toLowerCase();

  state.application=application;
  state.editable=isEditable(application.status??context?.status??"draft");

  bind();
  render();

  if(state.network==="mainnet"&&state.applicationId){
    await loadLogo();
  }
}

window.ALBukhrExternalProjectLogo=Object.freeze({
  init,
  upload,
  getState:()=>Object.freeze({
    ...state,
    logo:state.logo?{...state.logo}:null
  })
});

window.addEventListener(
  "albukhr:external-project-detail-ready",
  event=>init(event.detail||{})
);

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",bind,{once:true});
}else{
  bind();
}
})(window,document);
