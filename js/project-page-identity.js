/* ALBUKHR Project Page Identity Bootstrap v3
 * Loads before js/project.js.
 * Does not alter UI/UX. It only supplies a stable project identity
 * when project.html was reached without a query/hash identifier.
 */
(function(window, document){
  'use strict';

  function clean(v){ return String(v == null ? '' : v).trim(); }

  function parseIdentity(){
    const p = new URLSearchParams(window.location.search);
    const direct = clean(
      p.get('project') || p.get('slug') ||
      p.get('project_code') || p.get('project_id')
    );
    if (direct) return direct;

    const hash = clean(window.location.hash.replace(/^#/, ''));
    if (!hash) return '';
    const hp = new URLSearchParams(hash);
    return clean(
      hp.get('project') || hp.get('slug') ||
      hp.get('project_code') || hp.get('project_id') || hash
    );
  }

  async function resolveFromRegistry(){
    const direct = parseIdentity();
    if (direct) return direct;

    const core = window.ALBUKHR_SUPABASE;
    if (!core || typeof core.rpc !== 'function') return '';

    try {
      const result = await core.rpc('get_public_project_registry', {
        p_network: clean(core.network).toLowerCase()
      });
      if (result && result.error) return '';

      const rows = Array.isArray(result && result.data)
        ? result.data : [];

      /* Never guess when more than one public project exists. */
      if (rows.length !== 1) return '';

      const row = rows[0] || {};
      return clean(
        row.project_code || row.slug || row.id
      );
    } catch (_) {
      return '';
    }
  }

  function expose(identity){
    if (!identity) return;
    window.ALBukhrProjectIdentity = identity;

    /* project.js reads location.search at script evaluation time,
       so only rewrite the URL when it genuinely lacks identity. */
    const current = parseIdentity();
    if (current) return;

    const url = new URL(window.location.href);
    url.searchParams.set('project', identity);
    window.history.replaceState(
      { albukhrProject: identity },
      '',
      url.pathname + '?' + url.searchParams.toString() + url.hash
    );
  }

  window.ALBukhrResolveProjectIdentity = resolveFromRegistry;

  /* Must run before project.js. */
  window.ALBukhrProjectIdentityReady = resolveFromRegistry().then(expose);
})(window, document);
