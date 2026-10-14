Canje-canje na wannan review candidate
An bar Pi Studio Assistance da Developer-built dApp a matsayin tsoffin pathways.
An kiyaye sabon zaɓin Build an App for My ALBUKHR Project ga Internal da External kawai; Core projects ba sa cikin wannan flow.
An sabunta API pathway module ya yi amfani da public.dapp_service_get_eligible_projects(p_pi_uid, p_network) da ke cikin Mainnet schema, sannan ya tace owner kawai saboda live request constraint ba ta yarda da manager ba.
Submission yana sake duba project ID a server-side kafin rubuta request; project name da owner UUID daga browser ba su da iko.
An gyara frontend copy don kada ya yi iƙirarin cewa managers suna da izini a halin yanzu; an kuma fayyace lokacin da eligibility endpoint ya gaza.
Admin summary ya dogara da linkage fields da API ke dawo da su, ba PostgREST embedded relationship da endpoint bai select ba.
An ƙara CSS na Admin da guarded gateway builder wanda ke ƙirƙirar cikakken patched copy ba tare da taɓa original ba.
An cire executable SQL migration daga kunshin saboda an tabbatar da cewa Mainnet schema ya riga ya ƙunshi required columns, checks, foreign key da eligibility RPC. An bar read-only schema reconciliation SQL kawai.
An ƙara direct-owner cross-check: bayan eligibility RPC, API ta tabbatar cewa projects.owner_albukhr_user_id ya yi daidai da public.users.id na mai nema. Wannan yana hana contributor da RPC ya rarraba a matsayin owner a rubuta shi a matsayin ainihin project owner.
An ƙara gwajin regression da ya tabbatar cewa tsoffin payment routes da Admin status/quote routes suna nan bayan gateway overlay, sannan an gwada cewa builder ya ƙi stale gateway baseline ba tare da rubuta output ba.
An ƙara HTML/controller ID checks. Ba a yi GitHub write, SQL write, environment change, deployment, ko payment ba.
