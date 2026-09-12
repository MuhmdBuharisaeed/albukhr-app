ALBUKHR Index Logo Safe Migration 2.1
Files
1. js/project-config.js
Destination:
albukhr-app/js/project-config.js
This is the Logo + Public Registry configuration engine.
2. js/project-logo-renderer.js
Destination:
albukhr-app/js/project-logo-renderer.js
This is a compatibility bridge for the existing index.html.
Why this approach is safe
The current index.html already has working Popular Projects and Assets renderers. They currently output config.icon. Instead of rewriting those renderers, this bridge observes only:
#popularProjects
#assetsContainer
and replaces the contents of the existing .popular-icon / .asset-icon containers with an official logo_url.
Therefore it does NOT change:
existing CSS
card structure
Popular Projects global-staking ranking
Assets user-staking ordering
staking engine
authentication
Supabase core
Mainnet/Testnet switching
Dock Navigation
existing page navigation
Projects without an official registered logo are left with an empty existing visual container rather than an emoji or fake logo.
Required index.html change
Add this one script immediately after:
<script src="js/project-config.js"></script>
Add:
<script src="js/project-logo-renderer.js"></script>
No other index.html changes are required.
Future projects
When the public registry returns a new Core/Internal/External project with a valid logo_url, project-config.js merges it into PROJECT_CONFIG and the renderer automatically applies the registered logo.
No per-project logo edit is required.
Investment lifecycle
The project config exposes:
isActive(...)
canInvest(...)
Both require status active.
approved remains visible/read-only.
