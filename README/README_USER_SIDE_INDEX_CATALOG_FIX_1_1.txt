ALBUKHR USER-SIDE INDEX / PROJECT CATALOG FIX

Purpose
-------
Restore the seven-project Home catalog used by index.html while keeping the
server-authoritative registry as an overlay.

Seven Home catalog keys:
Azman, Labbaika, Barsh, Urban, Khairat, Hauwal, Raheem.

Important architecture
----------------------
1. PROJECT_CONFIG is the UI/catalog compatibility layer.
2. public.get_public_project_registry is the server registry bridge.
3. Registry metadata overlays a catalog entry when the project is registered
   in the current network.
4. APPROVED means publicly viewable; it does NOT authorize investment.
5. ACTIVE is still required by the server-side investment engine.
6. No LocalStorage is used for project authority.
7. Mainnet/Testnet remain separated by Environment Core and Supabase project.
8. No additional Core Projects are created in the database.

Files
-----
js/project-config.js
  Replace the current file with the supplied version.

supabase/migrations/20260911_public_project_registry_rpc.sql
  Run once in the appropriate Supabase database. Do not run a Mainnet
  migration against the Testnet database or vice versa.

Why this fixes the index
------------------------
The previous compatibility layer replaced the seven-project catalog with the
RPC response. Since only RAHEEM PHARMACY is registered now, that made the
catalog collapse to one row (or to zero rows if the RPC was unavailable).
The replacement keeps all seven legacy catalog entries immediately available,
then overlays server metadata when available.

The index.html Popular Projects and Assets renderers remain the authority for
their existing presentation behavior:
- Popular Projects: ranked by global staking data.
- Assets: the seven ecosystem catalog entries, reordered by the existing
  user's staking/global-staking rules.

RAHEEM PHARMACY
---------------
Registered server identity:
  id: 25af782e-d91b-467a-9219-3dd45294aaff
  code: RAHEEM-25
  slug: raheem-pharmacy
  core_slot: 1
  network: mainnet
  status: approved

The project detail page must continue to resolve Raheem through the
server-authoritative registry. Do not hardcode approval as investment access.


PROJECT LOGO RULE
------------------
Raheem Pharmacy must use its official registered logo from public.projects.logo_url.
The legacy index renderer currently reads PROJECT_CONFIG[project].icon, so the
compatibility layer supplies the trusted Raheem logo as the visual bridge. No
Raheem emoji/icon is used. When the server registry returns a logo_url, that
server value replaces the visual bridge.

Do not replace the official logo with a generic medical/pharmacy icon.
