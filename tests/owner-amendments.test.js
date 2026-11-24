"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const migration = read("albukhr-api/database/20261124090000_external_project_owner_amendments_v1.sql");
const gatewayPatch = read("albukhr-api/patches/external-project-gateway.amendments.patch");
const ownerJs = read("albukhr-app/js/external-project-owner-amendments.js");
const ownerCss = read("albukhr-app/css/external-project-owner-amendments.css");
const adminHtml = read("albukhr-admin/admin-external-project-amendments.html");
const adminJs = read("albukhr-admin/js/admin-external-project-amendments.js");
const ownerDashboardPatch = read("albukhr-app/patches/external-project-owner-dashboard.amendments.patch");
const ownerDetailPatch = read("albukhr-app/patches/external-project-detail.amendments.patch");
const adminLinkPatch = read("albukhr-admin/patches/admin-external-projects.amendments-link.patch");

function occurrences(source, token) { return source.split(token).length - 1; }

test("migration creates Mainnet-only amendment requests with a pending unique guard", () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.external_project_amendment_requests/);
  assert.match(migration, /CHECK \(network = 'mainnet'\)/);
  assert.match(migration, /external_project_amendment_one_pending_per_type_idx/);
  assert.match(migration, /WHERE network = 'mainnet' AND status = 'pending'/);
});

test("only owner contact email and phone can be requested as owner-contact changes", () => {
  assert.match(migration, /Only owner contact email and phone can be requested/);
  assert.match(migration, /contact_email/);
  assert.match(migration, /contact_phone/);
  assert.doesNotMatch(migration, /SET applicant_user_id\s*=/i);
  assert.doesNotMatch(migration, /SET owner_albukhr_user_id\s*=/i);
});

test("application owner and Mainnet are derived by trusted server RPC, not browser parameters", () => {
  assert.match(migration, /auth\.jwt\(\) ->> 'role'.*service_role/s);
  assert.match(migration, /u\.pi_uid = btrim\(p_pi_uid\)/);
  assert.match(migration, /a\.applicant_user_id = v_user_id/);
  assert.match(gatewayPatch, /p_pi_uid: identity\.pi_uid/);
  assert.match(gatewayPatch, /no-store, no-cache, must-revalidate, private/);
  assert.doesNotMatch(ownerJs, /p_pi_uid|p_network|owner_user_id|applicant_user_id/);
});

test("owner amendment requests are limited to approved or converted application states", () => {
  assert.match(migration, /lower\(v_application\.status\) NOT IN \('approved', 'converted'\)/);
  assert.match(ownerJs, /\["approved", "converted"\]/);
});

test("converted project linkage is verified against the canonical External owner", () => {
  assert.match(migration, /p\.project_type\) = 'external'/);
  assert.match(migration, /p\.owner_albukhr_user_id = v_user_id/);
  assert.match(migration, /converted_project_id IS DISTINCT FROM v_request\.converted_project_id/);
});

test("team changes are normalized, bounded and enforce one primary contact maximum", () => {
  assert.match(migration, /v_team_count < 1 OR v_team_count > 30/);
  assert.match(migration, /v_primary_count > 1/);
  assert.match(migration, /full_name.*email.*role.*title.*bio.*is_primary_contact/s);
  assert.match(ownerJs, /length > 30/);
  assert.match(ownerJs, /Only one team member can be the primary contact/);
  assert.match(ownerDetailPatch + ownerDashboardPatch, /complete proposed team list/);
  assert.match(migration, /v_request\.converted_project_id IS NOT NULL/);
  assert.match(migration, /v_application\.status\) = 'converted'/);
});

test("owner requests are snapshots and approval checks for stale data before applying", () => {
  assert.match(migration, /current_values jsonb NOT NULL/);
  assert.match(migration, /requested_values jsonb NOT NULL/);
  assert.match(migration, /v_current IS DISTINCT FROM v_request\.current_values/);
  assert.match(migration, /owner_amendment_requested/);
  assert.match(migration, /DELETE FROM public\.external_project_application_team/);
  assert.match(migration, /UPDATE public\.external_project_applications\s+SET contact_email/s);
});

test("admin review requires an authorized External Admin/Super Admin and AAL2", () => {
  assert.equal(occurrences(migration, "coalesce(auth.jwt() ->> 'aal', '') <> 'aal2'"), 2);
  assert.match(migration, /can_review_external_applications\(v_user_id\)/);
  assert.match(adminJs, /roles\.includes\("super_admin"\).*roles\.includes\("external_admin"\)/s);
  assert.match(adminJs, /ensureMfa\(\)/);
  assert.match(adminJs, /mfa\?\.verified/);
  assert.match(adminJs, /getAuthenticatorAssuranceLevel/);
  assert.match(adminJs, /assurance\?\.currentLevel !== "aal2"/);
});

test("owner workflow never updates records until Admin approval", () => {
  assert.match(ownerJs, /Submit(ting)? your amendment request for ALBUKHR review/);
  assert.match(ownerJs, /Current project details remain unchanged until ALBUKHR approves it/);
  assert.doesNotMatch(ownerJs, /replaceTeam\(|updateApplication\(/);
});

test("owner can view request history and pending requests block duplicate same-type submissions", () => {
  assert.match(ownerJs, /ownerAmendmentHistory/);
  assert.match(ownerJs, /pendingTypes\.has\("owner_contact"\)/);
  assert.match(ownerJs, /pendingTypes\.has\("project_team"\)/);
  assert.match(migration, /PENDING_AMENDMENT_EXISTS/);
});

test("trusted API routes are additive and bind identity from the verified Pi session", () => {
  assert.match(gatewayPatch, /router\.get\([\s\S]*?\/amendments/);
  assert.match(gatewayPatch, /router\.post\([\s\S]*?\/amendments/);
  assert.match(gatewayPatch, /gateway_get_my_external_project_amendments_trusted/);
  assert.match(gatewayPatch, /gateway_create_my_external_project_amendment_trusted/);
  assert.doesNotMatch(gatewayPatch, /input\.p_pi_uid|input\.pi_uid|input\.network/);
});

test("owner panel is integrated into both approved-detail and converted-owner pages", () => {
  assert.match(ownerDashboardPatch, /ownerAmendmentsPanel/);
  assert.match(ownerDashboardPatch, /external-project-owner-amendments\.js/);
  assert.match(ownerDetailPatch, /ownerAmendmentsPanel/);
  assert.match(ownerDetailPatch, /external-project-owner-amendments\.js/);
  assert.match(ownerDetailPatch, /Available after approval/);
});

test("Admin queue is a separate secured review page linked from External Project administration", () => {
  assert.match(adminHtml, /noindex,nofollow/);
  assert.match(adminHtml, /AAL2 REQUIRED/);
  assert.match(adminJs, /get_external_project_amendment_queue/);
  assert.match(adminJs, /review_external_project_amendment/);
  assert.match(adminLinkPatch, /admin-external-project-amendments\.html/);
});

test("amendments never enable ownership transfer, Pi payment, liquidity or withdrawals", () => {
  for (const source of [migration, ownerJs, adminJs]) {
    assert.doesNotMatch(source, /transfer[_ -]?ownership|owner[_ -]?transfer|Pi\.createPayment|requestWithdrawal|A2U payout/i);
  }
  assert.match(migration, /project identity, code, business identity, logo and documents/);
});

test("amendment table has RLS and no direct anon/authenticated privileges", () => {
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /REVOKE ALL ON TABLE public\.external_project_amendment_requests FROM PUBLIC, anon, authenticated/);
  assert.match(migration, /GRANT ALL ON TABLE public\.external_project_amendment_requests TO service_role/);
});

test("owner frontend uses only Mainnet API calls and keeps identity authority on server", () => {
  assert.match(ownerJs, /requireMainnet\(\)/);
  assert.match(ownerJs, /window\.ALBukhrExternalProjectApi\.getApplication/);
  assert.match(ownerJs, /\/api\/external-project\//);
  assert.doesNotMatch(ownerJs, /localStorage|sessionStorage|\.from\(['"]external_project_amendment_requests/);
});

test("CSS has balanced blocks and mobile layout rules", () => {
  assert.equal((ownerCss.match(/{/g) || []).length, (ownerCss.match(/}/g) || []).length);
  assert.match(ownerCss, /@media\s*\(max-width:\s*620px\)/);
  assert.match(ownerCss, /owner-amend-team-row/);
});
