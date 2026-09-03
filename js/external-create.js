/* =========================================================
   ALBUKHR EXTERNAL CREATE / EDIT CONTROLLER
   File: js/external-create.js

   Engine:
   - create_external_project_application
   - update_external_project_application

   Security:
   - Pi Auth required
   - Environment aware
   - No LocalStorage
========================================================= */

(function (window) {
  "use strict";

  let currentUser = null;
  let applicationId = null;
  let editMode = false;

  const fields = {
    projectCode:"projectCode", projectSlug:"projectSlug", projectName:"projectName",
    businessName:"businessName", country:"country", state:"state", city:"city",
    industry:"industry", category:"category", businessRegistrationNumber:"businessRegistrationNumber",
    businessAddress:"businessAddress", contactEmail:"contactEmail", contactPhone:"contactPhone",
    website:"website", piWallet:"piWallet", fundingRequired:"fundingRequired",
    fundingAsset:"fundingAsset", investmentModel:"investmentModel",
    projectDurationDays:"projectDurationDays", projectDescription:"projectDescription"
  };

  function el(id){return document.getElementById(id)}
  function value(key){return String(el(fields[key]).value || "").trim()}
  function setStatus(message,type){
    const s=el("formStatus"); s.textContent=message||""; s.className="form-status"+(type?" "+type:"");
  }
  function requireDeps(){
    if(!window.ALBukhrEnvironment) throw new Error("ALBUKHR Environment Core is unavailable.");
    if(!window.ALBUKHR_SUPABASE) throw new Error("ALBUKHR Supabase Core is unavailable.");
    if(!window.AlbukhrPiAuth) throw new Error("ALBUKHR Pi Auth Core is unavailable.");
    if(!window.ALBukhrEnvironment.isKnown()) throw new Error("ALBUKHR environment is not recognized.");
  }
  function payload(){
    return {
      project_code:value("projectCode"),
      project_slug:value("projectSlug"),
      project_name:value("projectName"),
      business_name:value("businessName"),
      country:value("country"),
      contact_email:value("contactEmail"),
      project_description:value("projectDescription"),
      business_registration_number:value("businessRegistrationNumber"),
      industry:value("industry"),
      category:value("category"),
      state:value("state"),
      city:value("city"),
      business_address:value("businessAddress"),
      website:value("website"),
      contact_phone:value("contactPhone"),
      pi_wallet:value("piWallet"),
      funding_required:Number(value("fundingRequired")),
      funding_asset:value("fundingAsset"),
      investment_model:value("investmentModel"),
      project_duration_days:Number(value("projectDurationDays"))
    };
  }
  function validate(p){
    const required=["project_code","project_slug","project_name","business_name","country","contact_email","project_description","industry","category","funding_asset","investment_model"];
    for(const key of required) if(!String(p[key]||"").trim()) throw new Error("Please complete all required fields.");
    if(!Number.isFinite(p.funding_required)||p.funding_required<0) throw new Error("Funding Required must be valid.");
    if(!Number.isInteger(p.project_duration_days)||p.project_duration_days<1) throw new Error("Project Duration must be at least 1 day.");
    return true;
  }
  function setField(id,val){
    if(val!==undefined && val!==null && el(id)) el(id).value=val;
  }
  function mapApplication(row){
    const m={
      projectCode:row.project_code,projectSlug:row.project_slug,projectName:row.project_name||row.name,
      businessName:row.business_name,country:row.country,state:row.state,city:row.city,
      industry:row.industry,category:row.category,businessRegistrationNumber:row.business_registration_number,
      businessAddress:row.business_address,contactEmail:row.contact_email,contactPhone:row.contact_phone,
      website:row.website,piWallet:row.pi_wallet,fundingRequired:row.funding_required,
      fundingAsset:row.funding_asset,investmentModel:row.investment_model,
      projectDurationDays:row.project_duration_days,projectDescription:row.project_description||row.description
    };
    Object.entries(m).forEach(([k,v])=>setField(k,v));
  }

  async function loadForEdit(){
    if(!applicationId) return;
    setStatus("Loading application for secure editing...");
    const network=window.ALBukhrEnvironment.getNetwork();

    const {data,error}=await window.ALBUKHR_SUPABASE
      .from("external_project_applications")
      .select("*")
      .eq("id",applicationId)
      .eq("network",network)
      .maybeSingle();

    if(error) throw error;
    if(!data) throw new Error("Application was not found or is not available in this network.");

    const status=String(data.status||data.application_status||"draft").toLowerCase();
    if(["approved","rejected"].includes(status)) throw new Error("This application can no longer be edited.");
    mapApplication(data);
    setStatus("Application loaded. Update the details and save your changes.","success");
  }

  async function submitForm(event){
    event.preventDefault();
    const button=el("saveButton");
    try{
      const p=payload(); validate(p);
      button.disabled=true;
      setStatus(editMode?"Saving secure application changes...":"Creating secure project application...");

      let result;
      if(editMode){
        result=await window.ALBUKHR_SUPABASE.rpc("update_external_project_application",{
          p_application_id:applicationId,
          p_payload:p
        });
      }else{
        result=await window.ALBUKHR_SUPABASE.rpc("create_external_project_application",p);
      }

      if(result.error) throw result.error;

      setStatus(editMode?"Application updated successfully.":"Application created successfully.","success");
      button.textContent=editMode?"Saved":"Created";

      window.setTimeout(()=>window.location.replace("external-project-dashboard.html"),700);
    }catch(error){
      console.error("[ALBUKHR EXTERNAL CREATE]",error);
      setStatus("Unable to save application: "+(error.message||"Unknown error"),"error");
      button.disabled=false;
      button.textContent=editMode?"Save Changes":"Create Application";
    }
  }

  function setupSlug(){
    el("projectName").addEventListener("input",function(){
      if(editMode||value("projectSlug")) return;
      el("projectSlug").value=this.value.toLowerCase().trim()
        .replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
    });
  }

  async function initialize(){
    try{
      requireDeps();
      currentUser=await window.AlbukhrPiAuth.requireAuth("login.html");
      if(!currentUser) return;

      const network=window.ALBukhrEnvironment.getNetwork();
      el("networkIndicator").textContent=network.toUpperCase();
      el("authUsername").textContent=currentUser.username||"ALBUKHR User";
      el("authNetwork").textContent=`Authenticated with Pi • ${network.toUpperCase()}`;
      el("authAvatar").textContent=String(currentUser.username||"A").charAt(0).toUpperCase();

      applicationId=new URLSearchParams(window.location.search).get("application_id");
      editMode=Boolean(applicationId);

      if(editMode){
        el("modeEyebrow").textContent="EXTERNAL PROJECT APPLICATION";
        el("pageTitle").textContent="Edit External Project";
        el("pageDescription").textContent="Update your draft or revision-requested application within the ALBUKHR review framework.";
        el("saveButton").textContent="Save Changes";
        await loadForEdit();
      }

      el("externalProjectForm").addEventListener("submit",submitForm);
      el("cancelButton").addEventListener("click",()=>window.location.href="external-project-dashboard.html");
      el("backButton").addEventListener("click",()=>window.location.href="external-project-dashboard.html");
      setupSlug();
    }catch(error){
      console.error("[ALBUKHR EXTERNAL CREATE INIT]",error);
      setStatus("Application form unavailable: "+(error.message||"Unknown error"),"error");
      el("saveButton").disabled=true;
    }
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",initialize,{once:true});
  else initialize();
})(window);
