"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const detailHtml = read("albukhr-app/external-project-detail.html");
const ownerHtml = read("albukhr-app/external-project-owner-dashboard.html");
const apiGateway = read("albukhr-api/src/external-project-gateway.js");
const adminHome = read("albukhr-admin/admin-external-projects.html");
const ownerJs = read("albukhr-app/js/external-project-owner-amendments.js");
const ownerCss = read("albukhr-app/css/external-project-owner-amendments.css");
const adminHtml = read("albukhr-admin/admin-external-project-amendments.html");
const adminJs = read("albukhr-admin/js/admin-external-project-amendments.js");
const migration = read("albukhr-api/database/20261124090000_external_project_owner_amendments_v1.sql");

function ids(source) {
  return [...source.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
}
function duplicates(values) {
  return values.filter((value, index) => values.indexOf(value) !== index);
}

test("full External Project detail page preserves existing sections and adds owner amendment workspace", () => {
  for (const token of [
    'id="detailContent"',
    'id="externalProjectLogoForm"',
    'id="projectInformation"',
    'id="businessInformation"',
    'id="fundingInformation"',
    'id="projectTeam"',
    'id="externalProjectDocumentForm"',
    'id="reviewHistory"',
    'id="fundingWorkspaceButton"',
    'id="ownerAmendmentsPanel"',
    'id="ownerContactEmail"',
    'id="ownerAmendmentTeamList"',
    'src="js/external-project-detail.js?v=20261120-owner-funding-entry-1"',
    'src="js/external-project-owner-amendments.js?v=20261124-amendments-v1"'
  ]) assert.ok(detailHtml.includes(token), `Missing preserved detail feature: ${token}`);
  assert.deepEqual(duplicates(ids(detailHtml)), []);
});

test("full converted Owner Dashboard preserves management, transparency and financial locks", () => {
  for (const token of [
    'id="ownerWorkspace"',
    'id="fundingLink"',
    'id="detailsLink"',
    'id="publisherPanel"',
    'id="ownerUpdateForm"',
    'id="ownerUpdateFeed"',
    'class="owner-panel owner-financial-locks"',
    'id="ownerAmendmentsPanel"',
    'id="ownerContactEmail"',
    'id="ownerAmendmentTeamList"',
    'src="js/external-project-owner-dashboard.js?v=20261124-phase-c1"',
    'src="js/external-project-owner-amendments.js?v=20261124-amendments-v1"'
  ]) assert.ok(ownerHtml.includes(token), `Missing Owner Dashboard feature: ${token}`);
  assert.ok(ownerHtml.includes("Withdrawals remain locked."));
  assert.deepEqual(duplicates(ids(ownerHtml)), []);
});

test("full API gateway retains all existing applicant, logo, team, document and review routes", () => {
  for (const token of [
    '"/policy/acknowledgment"',
    '"/applications"',
    '"/:applicationId"',
    '"/:applicationId/submit"',
    '"/:applicationId/logo"',
    '"/:applicationId/team"',
    '"/:applicationId/documents"',
    '"/:applicationId/documents/upload-target"',
    '"/:applicationId/documents/:documentId"',
    '"/:applicationId/reviews"',
    '"/:applicationId/review-history"',
    '"/:applicationId/audit-log"',
    '"/:applicationId/amendments"',
    'module.exports = { externalProjectGatewayRouter: router };'
  ]) assert.ok(apiGateway.includes(token), `Missing API route or export: ${token}`);
});

test("API amendment routes use the verified Pi identity and strict request types", () => {
  assert.match(apiGateway, /const identity = await verifiedPiIdentity\(req\)/);
  assert.match(apiGateway, /p_pi_uid: identity\.pi_uid/);
  assert.match(apiGateway, /gateway_get_my_external_project_amendments_trusted/);
  assert.match(apiGateway, /gateway_create_my_external_project_amendment_trusted/);
  assert.match(apiGateway, /\["owner_contact", "project_team"\]/);
  assert.doesNotMatch(apiGateway, /input\.p_pi_uid|input\.pi_uid|input\.network/);
});

test("all External Project gateway responses are non-cacheable", () => {
  assert.match(apiGateway, /Cache-Control", "no-store, no-cache, must-revalidate, private"/);
  assert.match(apiGateway, /Pragma", "no-cache"/);
  assert.ok(apiGateway.indexOf('res.set("Cache-Control"') < apiGateway.indexOf("const identity = await verifiedPiIdentity(req)"));
});

test("full Admin External Project page retains queue, filters, details and owner-amendment navigation", () => {
  for (const token of [
    'id="externalSopLink"',
    'id="securityState"',
    'data-status="submitted"',
    'data-status="approved"',
    'data-status="converted"',
    'id="queue"',
    'id="detail"',
    'href="admin-external-project-amendments.html"'
  ]) assert.ok(adminHome.includes(token), `Missing Admin page feature: ${token}`);
  assert.deepEqual(duplicates(ids(adminHome)), []);
});

test("Admin amendment page is noindex, Mainnet, and wired to the guarded Admin scripts", () => {
  assert.match(adminHtml, /noindex,nofollow/);
  assert.match(adminHtml, /MAINNET · AAL2 REQUIRED/);
  assert.match(adminHtml, /js\/core\/supabase-admin-auth\.js/);
  assert.match(adminHtml, /js\/admin-external-project-amendments\.js/);
  assert.match(adminJs, /can_review_external_applications|role|super_admin/);
  assert.match(adminJs, /getAuthenticatorAssuranceLevel/);
  assert.match(adminJs, /assurance\?\.currentLevel !== "aal2"/);
  assert.match(adminJs, /get_external_project_amendment_queue/);
  assert.match(adminJs, /review_external_project_amendment/);
});

test("owner request UI fails closed until Mainnet owner, project and amendment API are verified", () => {
  assert.match(ownerJs, /workspaceReady:\s*false/);
  assert.match(ownerJs, /setWorkspaceControls\(false\)/);
  assert.match(ownerJs, /!state\.workspaceReady/);
  assert.match(ownerJs, /approved", "converted/);
  assert.match(ownerJs, /Only the authenticated owner of a Mainnet External Project/);
});

test("owner frontend sends amendment requests only through the trusted API", () => {
  assert.match(ownerJs, /api\(\)\.post\("\/api\/external-project\//);
  assert.match(ownerJs, /api\(\)\.get\("\/api\/external-project\//);
  assert.doesNotMatch(ownerJs, /localStorage|sessionStorage|\.from\(['"]external_project_amendment_requests/);
  assert.doesNotMatch(ownerJs, /replaceTeam\(|updateApplication\(/);
  assert.match(ownerJs, /Current project details remain unchanged until ALBUKHR approves it/);
});

test("SQL limits owner contact amendments to email and phone and forbids ownership changes", () => {
  assert.match(migration, /CHECK \(network = 'mainnet'\)/);
  assert.match(migration, /Only owner contact email and phone can be requested/);
  assert.match(migration, /a\.applicant_user_id = v_user_id/);
  assert.match(migration, /p\.owner_albukhr_user_id = v_user_id/);
  assert.doesNotMatch(migration, /SET applicant_user_id\s*=/i);
  assert.doesNotMatch(migration, /SET owner_albukhr_user_id\s*=/i);
  assert.doesNotMatch(migration, /ownership transfer|transfer ownership/i);
});

test("team amendment is a bounded full-list snapshot with one primary contact maximum", () => {
  assert.match(migration, /v_team_count < 1 OR v_team_count > 30/);
  assert.match(migration, /v_primary_count > 1/);
  assert.match(migration, /current_values jsonb NOT NULL/);
  assert.match(migration, /requested_values jsonb NOT NULL/);
  assert.match(migration, /DELETE FROM public\.external_project_application_team/);
  assert.match(migration, /v_current IS DISTINCT FROM v_request\.current_values/);
  assert.match(ownerJs, /Keep at least one project team member/);
});

test("approval requires Mainnet External linkage and blocks stale snapshots", () => {
  assert.match(migration, /converted_project_id IS DISTINCT FROM v_request\.converted_project_id/);
  assert.match(migration, /lower\(p\.project_type\) = 'external'/);
  assert.match(migration, /Owner contact data changed after this request was created/);
  assert.match(migration, /Project team data changed after this request was created/);
});

test("Admin queue and review RPCs require External Admin/Super Admin role and current AAL2", () => {
  const aal2Checks = migration.match(/coalesce\(auth\.jwt\(\) ->> 'aal', ''\) <> 'aal2'/g) || [];
  assert.equal(aal2Checks.length, 2);
  assert.match(migration, /can_review_external_applications\(v_user_id\)/);
  assert.match(migration, /can_review_external_applications\(v_admin_id\)/);
  assert.match(migration, /reviewed_by = v_admin_id/);
});

test("owner request, Admin decision and applied changes are recorded in the existing audit log", () => {
  assert.match(migration, /owner_amendment_requested/);
  assert.match(migration, /owner_contact_amendment_approved/);
  assert.match(migration, /project_team_amendment_approved/);
  assert.match(migration, /owner_amendment_rejected/);
  assert.match(migration, /INSERT INTO public\.external_project_audit_log/);
});

test("amendment request table is RLS protected with no direct anon/authenticated table privileges", () => {
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /REVOKE ALL ON TABLE public\.external_project_amendment_requests FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /GRANT ALL ON TABLE public\.external_project_amendment_requests TO service_role/);
});

test("amendment feature does not enable funding, Pi payments, liquidity, custody or withdrawals", () => {
  for (const source of [migration, ownerJs, adminJs]) {
    assert.doesNotMatch(source, /Pi\.createPayment|A2U payout|requestWithdrawal|withdrawal execution/i);
  }
  assert.match(ownerHtml, /Liquidity settlement is not enabled/);
  assert.match(ownerHtml, /Withdrawals remain locked/);
});

test("amendment CSS has balanced blocks and responsive team layout", () => {
  assert.equal((ownerCss.match(/{/g) || []).length, (ownerCss.match(/}/g) || []).length);
  assert.match(ownerCss, /@media\s*\(max-width:\s*620px\)/);
  assert.match(ownerCss, /owner-amend-team-row/);
});
