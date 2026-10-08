/* ALBUKHR EXTERNAL PROJECT CREATE / EDIT
 * Mainnet uses the trusted External Project API adapter.
 * Testnet retains the existing applicant RPC contract until a trusted
 * Testnet External Project gateway/schema is provisioned.
 *
 * Project logo lifecycle:
 * - Mainnet requires one valid logo before a new application can be created.
 * - Existing editable applications may replace their logo.
 * - Logo bytes are uploaded only through the trusted Mainnet gateway.
 * - Applicant ownership/network is never supplied as an authority field.
 */
(function(window,document){
"use strict";

let user=null,id=null,status="draft",edit=false,saving=false;
const logoState={url:null,path:null,width:null,height:null,format:null,size_bytes:null};

const $=id=>document.getElementById(id);

function setStatus(m,t){
  const e=$("formStatus");
  if(e){
    e.textContent=String(m||"");
    e.className="form-status"+(t?" "+t:"");
  }
}

function setLogoStatus(m,t){
  const e=$("externalCreateLogoStatus");
  if(e){
    e.textContent=String(m||"");
    e.className="form-status"+(t?" "+t:"");
  }
}

function deps(){
  if(!window.ALBukhrEnvironment)throw new Error("ALBUKHR Environment Core is unavailable.");
  if(!window.ALBUKHR_SUPABASE)throw new Error("ALBUKHR Supabase Core is unavailable.");
  if(!window.AlbukhrPageAuthGuard)throw new Error("ALBUKHR Page Auth Guard is unavailable.");
  if(!window.ALBukhrExternalProjectApi)throw new Error("ALBUKHR External Project API is unavailable.");
  if(!window.ALBukhrEnvironment.isKnown())throw new Error("ALBUKHR environment is not recognized.");
}

function net(){
  const n=String(window.ALBukhrEnvironment.getNetwork()||"").trim().toLowerCase();
  if(!["mainnet","testnet"].includes(n))throw new Error("Invalid ALBUKHR network.");
  return n;
}

function uid(){
  const v=window.AlbukhrPageAuthGuard?.getPiUid?.()||user?.pi_uid||user?.uid;
  if(!v)throw new Error("Authenticated Pi UID is unavailable.");
  return String(v).trim();
}

function val(k){
  const e=$(k);
  return e?String(e.value||"").trim():"";
}

function norm(v){
  return String(v||"draft").trim().toLowerCase().replace(/\s+/g,"_");
}

function editable(v){
  return["draft","needs_revision"].includes(norm(v));
}

function payload(){
  return{
    p_project_name:val("projectName"),
    p_business_name:val("businessName"),
    p_country:val("country"),
    p_contact_email:val("contactEmail"),
    p_project_code:val("projectCode")||null,
    p_project_slug:val("projectSlug")||null,
    p_project_description:val("projectDescription")||null,
    p_business_registration_number:val("businessRegistrationNumber")||null,
    p_industry:val("industry")||null,
    p_category:val("category")||null,
    p_state:val("state")||null,
    p_city:val("city")||null,
    p_business_address:val("businessAddress")||null,
    p_website:val("website")||null,
    p_contact_phone:val("contactPhone")||null,
    p_pi_wallet:val("piWallet")||null,
    p_funding_required:val("fundingRequired")?Number(val("fundingRequired")):null,
    p_funding_asset:val("fundingAsset")||"PI",
    p_investment_model:val("investmentModel")||null,
    p_project_duration_days:val("projectDurationDays")?Number(val("projectDurationDays")):null
  };
}

function validate(p){
  for(const k of["p_project_name","p_business_name","p_country","p_contact_email"]){
    if(!String(p[k]||"").trim())throw new Error("Please complete all required fields.");
  }

  if((p.p_project_description||"").length>10000)throw new Error("Project description is too long.");

  if(p.p_funding_required!==null&&(!Number.isFinite(p.p_funding_required)||p.p_funding_required<=0)){
    throw new Error("Funding Required must be greater than zero.");
  }

  if(p.p_project_duration_days!==null&&(!Number.isInteger(p.p_project_duration_days)||p.p_project_duration_days<1)){
    throw new Error("Project Duration must be at least 1 day.");
  }

  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.p_contact_email)){
    throw new Error("Please provide a valid contact email.");
  }
}

function map(row){
  const m={
    projectCode:row.project_code,
    projectSlug:row.project_slug,
    projectName:row.project_name,
    businessName:row.business_name,
    country:row.country,
    state:row.state,
    city:row.city,
    industry:row.industry,
    category:row.category,
    businessRegistrationNumber:row.business_registration_number,
    businessAddress:row.business_address,
    contactEmail:row.contact_email,
    contactPhone:row.contact_phone,
    website:row.website,
    piWallet:row.pi_wallet,
    fundingRequired:row.funding_required,
    fundingAsset:row.funding_asset,
    investmentModel:row.investment_model,
    projectDurationDays:row.project_duration_days,
    projectDescription:row.project_description
  };

  Object.entries(m).forEach(([k,v])=>{
    if($(k)&&v!==null&&v!==undefined)$(k).value=v;
  });

  setLogoState(row);
}

function setLogoState(value){
  const v=value||{};
  logoState.url=v.logo_url||null;
  logoState.path=v.logo_path||null;
  logoState.width=v.logo_width??null;
  logoState.height=v.logo_height??null;
  logoState.format=v.logo_format||null;
  logoState.size_bytes=v.logo_size_bytes??null;
  renderLogo();
}

function logoIsReady(){
  return !!(
    logoState.url &&
    Number(logoState.width)>=400 &&
    Number(logoState.height)>=400 &&
    ["png","jpg","jpeg"].includes(String(logoState.format||"").toLowerCase()) &&
    Number(logoState.size_bytes)>0 &&
    Number(logoState.size_bytes)<=1048576
  );
}

function renderLogo(){
  const image=$("externalCreateLogoImage");
  const empty=$("externalCreateLogoEmpty");

  if(image){
    if(logoState.url){
      image.src=logoState.url + (logoState.url.includes("?") ? "&" : "?") + "v=" + Date.now();
      image.hidden=false;
    }else{
      image.removeAttribute("src");
      image.hidden=true;
    }
  }

  if(empty)empty.hidden=!!logoState.url;

  if(net()==="testnet"){
    setLogoStatus("Project logo is handled by the Mainnet External Project flow.", "info");
    return;
  }

  if(logoIsReady()){
    setLogoStatus(
      "Logo registered: "+logoState.width+" × "+logoState.height+" px • "+
      String(logoState.format||"").toUpperCase()+" • "+
      Math.round(Number(logoState.size_bytes)/1024)+" KB.",
      "success"
    );
  }else{
    setLogoStatus(
      edit
        ? "A valid project logo is required before this application can be submitted."
        : "A valid project logo is required for Mainnet application creation.",
      "error"
    );
  }
}

function allowedLogoMime(file){
  const type=String(file?.type||"").toLowerCase();
  if(type==="image/png"||type==="image/jpeg")return type;

  const name=String(file?.name||"").toLowerCase();
  if(name.endsWith(".png"))return "image/png";
  if(name.endsWith(".jpg")||name.endsWith(".jpeg"))return "image/jpeg";

  return "";
}

function inspectLogo(file){
  return new Promise((resolve,reject)=>{
    if(!file) return reject(new Error("Select a project logo first."));

    if(file.size<=0) return reject(new Error("The selected project logo is empty."));
    if(file.size>1048576) return reject(new Error("Project logo must be no larger than 1 MB."));

    const mime=allowedLogoMime(file);
    if(!mime) return reject(new Error("Project logo must be PNG or JPG/JPEG only."));

    const objectUrl=URL.createObjectURL(file);
    const image=new Image();

    image.onload=()=>{
      const width=Number(image.naturalWidth||image.width||0);
      const height=Number(image.naturalHeight||image.height||0);
      URL.revokeObjectURL(objectUrl);

      if(width<400||height<400){
        reject(new Error("Project logo must be at least 400 × 400 pixels."));
        return;
      }

      resolve({mime,width,height});
    };

    image.onerror=()=>{
      URL.revokeObjectURL(objectUrl);
      reject(new Error("The selected project logo could not be read as a valid image."));
    };

    image.src=objectUrl;
  });
}

function previewLogo(file){
  const image=$("externalCreateLogoImage");
  const empty=$("externalCreateLogoEmpty");
  if(!image)return;

  if(!file){
    if(!logoState.url){
      image.removeAttribute("src");
      image.hidden=true;
      if(empty)empty.hidden=false;
    }
    return;
  }

  const url=URL.createObjectURL(file);
  image.src=url;
  image.hidden=false;
  if(empty)empty.hidden=true;

  image.onload=()=>URL.revokeObjectURL(url);
}

async function validateSelectedLogo(){
  const input=$("externalCreateLogoFile");
  const file=input?.files?.[0]||null;
  if(!file)throw new Error("Select a project logo first.");
  return inspectLogo(file);
}

async function loadLogo(){
  if(net()!=="mainnet"||!id)return;

  try{
    const data=await window.ALBukhrExternalProjectApi.getLogo(id);
    const row=Array.isArray(data)?data[0]:data;
    if(row)setLogoState(row);
  }catch(error){
    console.warn("[ALBUKHR EXTERNAL CREATE] Logo load failed:",error);
  }
}

async function rpc(name,p){
  const r=await window.ALBUKHR_SUPABASE.rpc(name,p);
  if(r.error)throw r.error;
  return r.data;
}

function params(extra){
  return Object.assign(
    {p_application_id:id,p_pi_uid:uid(),p_network:net()},
    extra||{}
  );
}

async function load(){
  setStatus("Loading your external project application...");

  const data=net()==="mainnet"
    ?await window.ALBukhrExternalProjectApi.getApplication(id)
    :await rpc("get_my_external_project_detail",params());

  const row=Array.isArray(data)?data[0]:data;

  if(!row)throw new Error("Application was not found or access was denied.");

  status=norm(row.status);

  if(!editable(status)){
    throw new Error("This application cannot be edited in its current status.");
  }

  map(row);

  if(net()==="mainnet"){
    await loadLogo();
  }

  setStatus(
    status==="needs_revision"
      ?"ALBUKHR requested changes. Update the application, then continue from the detail page."
      :"Application loaded successfully. You can continue editing.",
    "success"
  );
}

async function create(p){
  return net()==="mainnet"
    ?String(await window.ALBukhrExternalProjectApi.createApplication(p))
    :String(await rpc(
      "create_my_external_project_application",
      Object.assign({p_pi_uid:uid(),p_network:net()},p)
    ));
}

async function update(p){
  const r=net()==="mainnet"
    ?await window.ALBukhrExternalProjectApi.updateApplication(id,p)
    :await rpc(
      "update_my_external_project_application",
      Object.assign(
        {p_application_id:id,p_pi_uid:uid(),p_network:net()},
        p
      )
    );

  if(r!==true)throw new Error("Application update was not accepted.");
}

async function uploadLogoForApplication(applicationId,file){
  if(net()!=="mainnet"){
    throw new Error("Secure External Project logo upload is currently available on MAINNET only.");
  }

  const meta=await inspectLogo(file);
  setLogoStatus("Uploading and registering project logo securely.","loading");

  const result=await window.ALBukhrExternalProjectApi.uploadLogo(
    applicationId,
    file
  );

  const data=result||{};

  setLogoState({
    logo_url:data.logo_url,
    logo_path:data.logo_path,
    logo_width:data.logo_width??meta.width,
    logo_height:data.logo_height??meta.height,
    logo_format:data.logo_format||(meta.mime==="image/png"?"png":"jpg"),
    logo_size_bytes:data.logo_size_bytes??file.size
  });

  setLogoStatus("Project logo uploaded and registered successfully.","success");
}

function ui(){
  $("externalProjectForm")?.addEventListener("submit",save);

  $("cancelButton")?.addEventListener(
    "click",
    ()=>location.assign("external-project-dashboard.html")
  );

  const n=$("projectName");
  const s=$("projectSlug");

  n?.addEventListener("input",()=>{
    if(s&&!s.value.trim()){
      s.value=String(n.value||"")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g,"-")
        .replace(/^-+|-+$/g,"");
    }
  });

  $("externalCreateLogoFile")?.addEventListener("change",async()=>{
    const file=$("externalCreateLogoFile")?.files?.[0]||null;

    if(!file){
      renderLogo();
      return;
    }

    previewLogo(file);

    try{
      const result=await inspectLogo(file);
      setLogoStatus(
        "Selected logo: "+result.width+" × "+result.height+" px • "+
        result.mime.toUpperCase().replace("IMAGE/","")+". Ready to save.",
        "success"
      );
    }catch(error){
      setLogoStatus(error?.message||"Invalid project logo.","error");
    }
  });
}

function auth(){
  const n=net();
  const u=user?.username||user?.pi_username||"ALBUKHR User";

  if($("networkIndicator"))$("networkIndicator").textContent=n.toUpperCase();
  if($("authUsername"))$("authUsername").textContent=u;
  if($("authNetwork"))$("authNetwork").textContent="Authenticated with Pi • "+n.toUpperCase();
  if($("authAvatar"))$("authAvatar").textContent=u.charAt(0).toUpperCase();

  if(edit){
    if($("modeEyebrow"))$("modeEyebrow").textContent="EXTERNAL PROJECT APPLICATION";
    if($("pageTitle"))$("pageTitle").textContent="Edit External Project";
  }

  if(n==="testnet"){
    const section=document.querySelector(".external-logo-section");
    if(section)section.hidden=true;
  }else{
    const section=document.querySelector(".external-logo-section");
    if(section)section.hidden=false;
  }

  renderLogo();
}

function keepEditingAfterCreate(applicationId){
  id=applicationId;
  edit=true;
  status="draft";
  const next="external-create.html?application_id="+encodeURIComponent(id);
  window.history.replaceState({applicationId:id},"",next);

  if($("modeEyebrow"))$("modeEyebrow").textContent="EXTERNAL PROJECT APPLICATION";
  if($("pageTitle"))$("pageTitle").textContent="Edit External Project";
}

async function save(e){
  e.preventDefault();

  if(saving)return;
  saving=true;

  const b=$("saveDraftButton");

  try{
    const p=payload();
    validate(p);

    const mainnet=net()==="mainnet";
    const selectedLogo=$("externalCreateLogoFile")?.files?.[0]||null;

    if(mainnet){
      if(!edit&&!selectedLogo){
        throw new Error("Project logo is required before creating a Mainnet application.");
      }

      if(edit&&!logoIsReady()&&!selectedLogo){
        throw new Error("Project logo is required before this Mainnet application can continue.");
      }

      if(selectedLogo){
        await inspectLogo(selectedLogo);
      }
    }

    if(b){
      b.disabled=true;
      b.textContent=edit?"Saving...":"Creating...";
    }

    if(edit){
      await update(p);

      if(mainnet&&selectedLogo){
        if(b)b.textContent="Uploading Logo...";
        await uploadLogoForApplication(id,selectedLogo);
      }

      setStatus(
        mainnet&&!logoIsReady()
          ?"Application changes saved, but a valid project logo is still required."
          :"Application changes saved successfully.",
        mainnet&&!logoIsReady()?"error":"success"
      );

      renderLogo();
    }else{
      id=await create(p);
      edit=true;
      status="draft";

      if(mainnet){
        if(b)b.textContent="Uploading Logo...";
        await uploadLogoForApplication(id,selectedLogo);
      }

      location.replace(
        "external-project-detail.html?application_id="+encodeURIComponent(id)
      );
      return;
    }
  }catch(err){
    console.error("[ALBUKHR EXTERNAL CREATE]",err);

    if(id&&edit&&net()==="mainnet"&&!logoIsReady()){
      setStatus(
        "Application saved or created, but the project logo is not ready: "+
        (err?.message||"Unknown error")+
        " You can retry the logo upload here.",
        "error"
      );
    }else{
      setStatus(
        "Unable to save application: "+(err?.message||"Unknown error"),
        "error"
      );
    }
  }finally{
    saving=false;

    if(b){
      b.disabled=false;
      b.textContent=edit?"Save Changes":"Create Application";
    }
  }
}

async function init(){
  try{
    deps();

    user=await window.AlbukhrPageAuthGuard.waitForAuth();
    if(!user)return;

    id=new URLSearchParams(location.search).get("application_id");
    edit=!!id;

    ui();
    auth();

    if(edit){
      await load();
    }else{
      renderLogo();
      setStatus("Complete the project information and create your application.");
    }
  }catch(e){
    console.error("[ALBUKHR EXTERNAL CREATE]",e);
    setStatus(
      "Application form unavailable: "+(e?.message||"Unknown error"),
      "error"
    );

    if($("saveDraftButton"))$("saveDraftButton").disabled=true;
  }
}

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",init,{once:true});
}else{
  init();
}
})(window,document);
