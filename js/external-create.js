/* ALBUKHR External Project Create Controller
   Uses only shared cores and existing database RPC:
   create_external_project_application(...)
*/
(function(window){
"use strict";

const Auth = window.AlbukhrPiAuth;
const Environment = window.ALBukhrEnvironment;
const DB = window.ALBUKHR_SUPABASE;

function status(message,type){
 const el=document.getElementById("status");
 if(!el)return;
 el.textContent=message;
 el.className="status"+(type?" "+type:"");
}
function button(disabled,text){
 const b=document.getElementById("submitButton");
 if(!b)return;
 b.disabled=!!disabled;
 if(text)b.innerHTML="<span>"+text+"</span><span>→</span>";
}
function slugify(value){
 return String(value||"").trim().toLowerCase()
 .replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
}
function required(value,name){
 if(value===null||value===undefined||String(value).trim()===""){
   throw new Error(name+" is required.");
 }
 return value;
}
function getFormData(){
 const form=document.getElementById("externalProjectForm");
 const fd=new FormData(form);
 const projectName=required(fd.get("project_name"),"Project name");
 const slug=slugify(fd.get("project_slug")||projectName);
 const funding=Number(fd.get("funding_required"));
 const duration=Number(fd.get("project_duration_days"));
 if(!Number.isFinite(funding)||funding<0)throw new Error("Funding required must be a valid amount.");
 if(!Number.isInteger(duration)||duration<1)throw new Error("Project duration must be at least 1 day.");
 return {
  p_project_code:String(required(fd.get("project_code"),"Project code")).trim(),
  p_project_slug:required(slug,"Project slug"),
  p_project_name:String(projectName).trim(),
  p_business_name:String(required(fd.get("business_name"),"Business name")).trim(),
  p_country:String(required(fd.get("country"),"Country")).trim(),
  p_contact_email:String(required(fd.get("contact_email"),"Contact email")).trim(),
  p_project_description:String(required(fd.get("project_description"),"Project description")).trim(),
  p_business_registration_number:String(fd.get("business_registration_number")||"").trim(),
  p_industry:String(required(fd.get("industry"),"Industry")).trim(),
  p_category:String(required(fd.get("category"),"Category")).trim(),
  p_state:String(fd.get("state")||"").trim(),
  p_city:String(fd.get("city")||"").trim(),
  p_business_address:String(fd.get("business_address")||"").trim(),
  p_website:String(fd.get("website")||"").trim(),
  p_contact_phone:String(fd.get("contact_phone")||"").trim(),
  p_pi_wallet:String(fd.get("pi_wallet")||"").trim(),
  p_funding_required:funding,
  p_funding_asset:String(required(fd.get("funding_asset"),"Funding asset")).trim(),
  p_investment_model:String(required(fd.get("investment_model"),"Investment model")).trim(),
  p_project_duration_days:duration
 };
}
async function initialize(){
 try{
  if(!Environment||!Environment.isKnown())throw new Error("ALBUKHR environment is unavailable.");
  if(!DB)throw new Error("ALBUKHR database core is unavailable.");
  if(!Auth)throw new Error("ALBUKHR Pi Auth Core is unavailable.");
  document.getElementById("networkBadge").textContent=Environment.getName();
  status("Secure Pi authentication required.");
  const user=await Auth.requireAuth("login.html");
  if(!user)return;
  status("Authenticated as "+user.username+". You can create an external project application.","success");
 }catch(e){
  console.error("[ALBUKHR EXTERNAL CREATE]",e);
  status(e.message||"Unable to initialize secure application access.","error");
  button(true,"Access unavailable");
 }
}
async function submit(event){
 event.preventDefault();
 try{
  if(!document.getElementById("truthDeclaration").checked){
   throw new Error("Please confirm the information declaration.");
  }
  const user=await Auth.requireAuth("login.html");
  if(!user)throw new Error("Authentication is required.");
  const params=getFormData();
  button(true,"Submitting application...");
  status("Submitting your external project application...");
  const result=await DB.rpc("create_external_project_application",params);
  if(result.error)throw result.error;
  status("Application created successfully. Your project is now awaiting the next review stage.","success");
  button(true,"Application submitted");
  console.info("[ALBUKHR EXTERNAL PROJECT CREATED]",result.data);
 }catch(e){
  console.error("[ALBUKHR EXTERNAL CREATE SUBMIT]",e);
  status(e.message||"Unable to submit application.","error");
  button(false,"Submit Project Application");
 }
}
document.addEventListener("DOMContentLoaded",function(){
 const name=document.getElementById("projectName");
 const slug=document.getElementById("projectSlug");
 if(name&&slug){
   name.addEventListener("input",function(){
     if(!slug.dataset.userEdited)slug.value=slugify(name.value);
   });
   slug.addEventListener("input",function(){
     slug.dataset.userEdited="true";
     slug.value=slugify(slug.value);
   });
 }
 const form=document.getElementById("externalProjectForm");
 if(form)form.addEventListener("submit",submit);
 initialize();
});
})(window);
