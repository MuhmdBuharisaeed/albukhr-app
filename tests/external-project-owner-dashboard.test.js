"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const dashboardHtml = read("external-project-dashboard.html");
const ownerHtml = read("external-project-owner-dashboard.html");
const entryJs = read("js/external-project-dashboard-owner-entry.js");
const ownerJs = read("js/external-project-owner-dashboard.js");
const ownerCss = read("css/external-project-owner-dashboard.css");

function occurrences(source, token) {
  return source.split(token).length - 1;
}

test("existing External dashboard retains the existing app/auth dependencies and adds one owner-entry script", () => {
  assert.match(dashboardHtml, /js\/core\/environment-core\.js/);
  assert.match(dashboardHtml, /js\/core\/supabase-core\.js/);
  assert.match(dashboardHtml, /js\/core\/pi-auth-core\.js/);
  assert.match(dashboardHtml, /js\/core\/albukhr-api-core\.js/);
  assert.match(dashboardHtml, /js\/core\/external-project-api\.js/);
  assert.match(dashboardHtml, /js\/core\/page-auth-guard\.js/);
  assert.match(dashboardHtml, /js\/external-project-dashboard\.js/);
  assert.equal(occurrences(dashboardHtml, "js/external-project-dashboard-owner-entry.js"), 1);
});

test("Owner Dashboard entry is rendered only for converted application cards", () => {
  assert.match(entryJs, /isVerifiedMainnet\(\)/);
  assert.match(entryJs, /getNetwork\(\).*mainnet|toLowerCase\(\) === "mainnet"/);
  assert.match(entryJs, /status\.classList\.contains\("status-converted"\)/);
  assert.match(entryJs, /external-project-owner-dashboard\.html\?/);
  assert.match(entryJs, /application_id/);
  assert.match(entryJs, /MutationObserver/);
  assert.match(entryJs, /__ALBUKHR_EXTERNAL_OWNER_ENTRY__/);
});

test("owner workspace verifies Mainnet Pi auth and server-loaded application ownership", () => {
  assert.match(ownerJs, /requireMainnet\(\)/);
  assert.match(ownerJs, /waitForAuth\(\)/);
  assert.match(ownerJs, /ALBukhrExternalProjectApi\.getApplication/);
  assert.match(ownerJs, /application\.network/);
  assert.match(ownerJs, /application\.status\)\.toLowerCase\(\) !== "converted"/);
  assert.match(ownerJs, /application\.converted_project_id/);
  assert.match(ownerJs, /validUuid\(state\.applicationId\)/);
});

test("publisher grant matches exact converted project, code, type, network and eligible server status", () => {
  assert.match(ownerJs, /\/publisher-projects/);
  assert.match(ownerJs, /candidate\.project_id\) === state\.projectId/);
  assert.match(ownerJs, /candidate\.project_code/);
  assert.match(ownerJs, /candidate\.project_type\)\.toLowerCase\(\) === "external"/);
  assert.match(ownerJs, /candidate\.network\)\.toLowerCase\(\) === MAINNET/);
  assert.match(ownerJs, /\["approved", "active"\]/);
  assert.match(ownerJs, /state\.publisherGranted = true/);
});

test("unverified publisher grant keeps public publishing disabled", () => {
  assert.match(ownerJs, /if \(!match\)/);
  assert.match(ownerJs, /state\.publisherGranted = false/);
  assert.match(ownerJs, /button\.disabled = !state\.publisherGranted \|\| state\.publishing/);
});

test("Project Updates uses the shared trusted API and signed storage upload, not direct table writes", () => {
  assert.match(ownerJs, /PROJECT_UPDATES_API \+ \"\/publisher-projects\"/);
  assert.match(ownerJs, /PROJECT_UPDATES_API \+ \"\/feed\?\"/);
  assert.match(ownerJs, /\/upload-intents/);
  assert.match(ownerJs, /uploadToSignedUrl/);
  assert.match(ownerJs, /\/updates/);
  assert.doesNotMatch(ownerJs, /\.from\(["']project_updates["']\)/);
  assert.doesNotMatch(ownerJs, /external-project-owner-operations/);
});

test("publishing requires title, body, supported evidence image and the 10 MiB limit", () => {
  assert.match(ownerJs, /title\.length > 160/);
  assert.match(ownerJs, /body\.length > 10000/);
  assert.match(ownerJs, /\["progress", "milestone"\]/);
  assert.match(ownerJs, /file\.size > MAX_IMAGE_BYTES/);
  assert.match(ownerJs, /image\/jpeg/);
  assert.match(ownerJs, /image\/png/);
  assert.match(ownerJs, /image\/webp/);
});

test("publishing has a duplicate-submit lock and clears form after trusted publication", () => {
  assert.match(ownerJs, /if \(state\.publishing\) return/);
  assert.match(ownerJs, /state\.publishing = true/);
  assert.match(ownerJs, /state\.publishing = false/);
  assert.match(ownerJs, /await loadFeed\(true\)/);
});

test("feed supports cursor pagination and de-duplicates update IDs", () => {
  assert.match(ownerJs, /next_cursor/);
  assert.match(ownerJs, /has_more/);
  assert.match(ownerJs, /state\.itemIds\.has\(id\)/);
  assert.match(ownerJs, /loadOlderOwnerUpdatesButton/);
});

test("funding and detail workflows link to existing External pages", () => {
  assert.match(ownerHtml, /external-project-funding\.html/);
  assert.match(ownerHtml, /external-project-detail\.html/);
  assert.match(ownerJs, /fundingLink/);
  assert.match(ownerJs, /detailsLink/);
});

test("liquidity and withdrawals remain explicitly locked; no Pi payment or payout code is introduced", () => {
  assert.match(ownerHtml, /Liquidity settlement is not enabled/);
  assert.match(ownerHtml, /Withdrawals remain locked/);
  assert.doesNotMatch(ownerJs, /Pi\.createPayment/);
  assert.doesNotMatch(ownerJs, /requestWithdrawal/);
  assert.doesNotMatch(ownerJs, /\/withdrawals/);
  assert.doesNotMatch(ownerHtml, /external-project-owner-operations-api\.js/);
});

test("new owner frontend does not use browser persistence or direct database mutations", () => {
  for (const source of [entryJs, ownerJs]) {
    assert.doesNotMatch(source, /localStorage|sessionStorage/);
    assert.doesNotMatch(source, /\.from\(["']project_updates["']\)\.insert/);
  }
});

test("Owner Dashboard page loads shared cores before the owner controller", () => {
  const order = [
    "js/core/environment-core.js",
    "js/core/supabase-core.js",
    "js/core/pi-auth-core.js",
    "js/core/albukhr-api-core.js",
    "js/core/external-project-api.js",
    "js/core/page-auth-guard.js",
    "js/core/environment-switcher.js",
    "js/external-project-owner-dashboard.js"
  ].map((needle) => ownerHtml.indexOf(needle));
  assert.ok(order.every((index) => index >= 0));
  assert.deepEqual(order, [...order].sort((a, b) => a - b));
  assert.equal(occurrences(ownerHtml, "js/external-project-owner-dashboard.js"), 1);
});

test("Owner Dashboard HTML IDs are unique and all required control IDs exist", () => {
  const ids = [...ownerHtml.matchAll(/\bid=["']([^"']+)["']/g)].map((m) => m[1]);
  assert.equal(ids.length, new Set(ids).size, "HTML IDs must be unique");
  for (const id of [
    "ownerStatus", "ownerLoading", "ownerError", "ownerWorkspace", "projectName",
    "ownerUpdateForm", "ownerUpdateTitle", "ownerUpdateBody", "ownerUpdateKind",
    "ownerUpdateImage", "publishOwnerUpdateButton", "ownerPublisherStatus",
    "ownerFeedStatus", "ownerUpdateFeed", "refreshOwnerFeedButton",
    "loadOlderOwnerUpdatesButton", "refreshOwnerWorkspaceButton"
  ]) assert.ok(ids.includes(id), `Missing owner page control: ${id}`);
});

test("new Owner Dashboard CSS is structurally balanced and responsive", () => {
  assert.equal((ownerCss.match(/{/g) || []).length, (ownerCss.match(/}/g) || []).length);
  assert.match(ownerCss, /@media/);
  assert.match(ownerCss, /owner-update-form/);
  assert.match(ownerCss, /owner-lock-card/);
});
