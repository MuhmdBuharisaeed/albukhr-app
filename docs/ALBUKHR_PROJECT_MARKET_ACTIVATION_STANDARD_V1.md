ALBUKHR Project Market Activation Standard
Version 1.0
Document ID: ALB-PMF-PMA-001
Version: 1.0
Status: Controlled Design Draft
Owner: ALBUKHR Investment Limited
Scope: Core, Internal/Contributor and External Projects; Mainnet and Testnet
1. Purpose
This standard defines how an ALBUKHR project moves from an approved project record to an operationally active market project.
Activation is not the same as approval. Approval establishes that the project has passed its applicable project-review stage. Activation establishes that the project has passed the additional economic, risk, liquidity, disclosure, contract and technical readiness controls required for the specific activity that will be exposed to users.
No project should become investment/staking eligible merely because an administrator has an interface button capable of changing its status.
2. Core Rule
The activation chain is:
Project Approval → Funding Readiness → Economic Readiness → Risk Readiness → Liquidity Readiness → Disclosure Readiness → Staking Contract Readiness → Technical Readiness → Final Authorization → ACTIVE
The exact gates may differ by project type and activity, but every active project must satisfy the applicable mandatory controls.
3. Approval vs Activation
APPROVED
The project has passed the applicable administrative review.
An approved project may be visible in the registry according to platform rules, but approval alone does not authorize new staking/investment.
ACTIVE
The project has passed all applicable activation gates and is eligible for the user activity explicitly enabled by its activation scope.
RESTRICTED
The project remains identifiable but one or more market activities are restricted because a readiness, liquidity, risk or control condition is not currently satisfied.
PAUSED
New user activity is temporarily blocked while existing records remain intact, subject to the applicable contractual and legal framework.
SUSPENDED
The project is removed from normal active market operation pending investigation, remediation, regulatory/legal review or administrative resolution.
CLOSED
The project is no longer accepting new activity. Existing obligations must be reconciled and settled according to applicable contracts, records and legal requirements.
4. Activation Is Scope-Based
Activation must identify what the project is authorized to do.
Examples of possible scopes:
Marketplace visibility
New staking
New investment
Existing-position reward claims
Capital withdrawal
Project-owner treasury operations
A project may be visible without being investment-active.
The system should therefore avoid treating a single boolean such as active = true as sufficient for every operational capability. Capability-specific server-side checks remain authoritative.
5. Universal Activation Gates
The following gates apply as relevant to all project types.
Gate 1 — Identity
Project exists in the correct network.
Project code is unique within its required scope.
Project type is valid.
Slug and registry identity are resolved.
Required project logo/identity information is present.
Gate 2 — Approval
The project has passed the applicable approval/review workflow.
Required administrative decision is recorded.
Approval is not revoked or superseded.
Gate 3 — Funding Profile
Funding purpose is defined.
Business stage is defined.
Funding target is defined where funding is required.
Use of funds is documented.
Capital deployment plan is documented.
Gate 4 — Economic Model
Business purpose is disclosed.
Economic model is documented.
Current/historical data and forecasts are clearly distinguished.
Material assumptions are disclosed.
Capital cycle is defined.
Gate 5 — Risk
Applicable risk dimensions are assessed.
Material risks are disclosed.
Risk methodology/version is recorded.
Any project-specific risk conditions are satisfied.
No unresolved blocking risk event exists.
Gate 6 — Liquidity/Treasury
Treasury configuration exists where required.
Required reserves are defined.
Eligible liquidity is verified where required.
Liquidity coverage requirements are satisfied.
Restricted user funds are segregated conceptually and technically from owner-withdrawable liquidity.
Treasury reconciliation is healthy.
Gate 7 — Disclosure
Project disclosure package is complete.
Funding objective is clear.
Use of funds is visible.
Staking/investment terms are visible.
Withdrawal rules are visible.
Key risks are visible.
Material limitations are visible.
User-facing version is traceable.
Gate 8 — Staking/Investment Contract
Project-specific term exists where staking/investment is offered.
Term matches the authoritative project identity.
Duration is valid.
Minimum/maximum constraints are valid where applicable.
Reward rule is defined.
Capital maturity rule is defined.
Reward withdrawal rule is defined.
Early withdrawal rule is defined where applicable.
Version and effective date are recorded.
Existing user positions cannot be rewritten by a new term.
Gate 9 — Technical Readiness
Server-side investment eligibility checks are active.
Payment approval/completion routes validate the project and network.
Treasury checks occur server-side.
Staking term resolution occurs server-side.
Duplicate-payment/idempotency protections are active.
Audit events are recorded.
Mainnet cannot consume Testnet financial state and vice versa.
Gate 10 — Final Authorization
The designated authorization path must confirm that all blocking gates are satisfied.
The final authorization action must be server-authoritative and must record:
actor
role
project
network
previous status
new status
reason
timestamp
relevant readiness snapshot/version
6. Core Project Activation
Core projects are ALBUKHR-controlled foundational projects and use the Core-specific activation path.
Minimum Core activation logic:
Core Approval → Treasury Configuration → Required Liquidity → Exact Project Staking Terms → Contract/Disclosure Readiness → ACTIVE
Core activation must not proceed when:
project status is not approved
project is not a Mainnet Core project for Mainnet activation
treasury is missing when treasury is required
required liquidity has not been verified
required wallet/treasury configuration is incomplete
no exact project-code active staking term exists when staking is to be enabled
a blocking risk/control condition exists
The activation function must be Core-specific. A generic activation function must not bypass Core controls.
7. Internal / Contributor Project Activation
Internal projects originating from eligible Contributors require the Contributor-specific readiness path.
Minimum logic:
Contributor Eligibility → Project Submission → Internal Review/Approval → Owner/Contributor Verification → Project Readiness → Treasury/Liquidity Readiness → Terms Readiness → Disclosure → ACTIVE
The project must retain linkage to the eligible contributor and applicable contributor records/agreements.
The Internal activation path must not automatically inherit Core activation assumptions. Its controls should reflect the Contributor architecture.
8. External Project Activation
External projects require a separate external-project activation path.
Minimum logic:
Application → Ownership Verification → Due Diligence → Risk Assessment → Funding Structure → Escrow/Custody Controls Where Required → Terms → Disclosure → Funding Readiness → ACTIVE
Where ALBUKHR handles investor funds for an external project, the required custody/escrow/legal structure must be established before activation.
External activation must not be treated as equivalent to Internal or Core activation.
9. Funding Readiness
A project must not be treated as funding-ready simply because it has an approved funding target.
Funding readiness should establish:
Why capital is needed.
What the capital will purchase or fund.
The deployment sequence.
Relevant dependencies.
Expected economic activity.
Expected capital cycle.
Required reserves.
What happens if the funding target is not reached.
For Build projects, setup/execution readiness receives greater weight.
For Growth/Expansion projects, historical operating evidence and the relationship between existing capacity and proposed expansion are relevant.
For Working Capital projects, the operating cycle and replenishment model are especially important.
10. Liquidity Readiness
Before new staking/investment is opened, the project must satisfy the liquidity conditions applicable to its model.
The activation gate should evaluate:
Eligible Liquidity vs Eligible Obligations
The project may be blocked or restricted if required liquidity coverage is not satisfied.
Activation readiness must distinguish:
Total treasury balance
Operating capital
User-committed capital
Reward reserve
Required liquidity reserve
Escrowed/restricted funds
Owner-withdrawable liquidity
A total balance must never be treated as fully withdrawable liquidity by default.
11. Reward Capacity Readiness
The project, not ALBUKHR, proposes project-specific reward terms within the permitted framework.
Before activation, the system should verify that the proposed reward terms are supported by the project's disclosed:
Capital requirement
Capital cycle
Economic model
Liquidity structure
Reward obligations
Risk profile
Duration
The readiness engine should block unsupported or incomplete terms rather than silently inventing a reward rate.
ALBUKHR must not represent a project's reward as an ALBUKHR-guaranteed return.
12. Term Identity and Project Code
The authoritative staking term must resolve to the exact project identity required by the staking contract.
The activation process must not assume that a base code and a full project code are interchangeable unless the authoritative contract explicitly defines that relationship.
Before any production term migration, engineering must confirm all dependencies across:
database functions
API routes
staking engine
project configuration
project pages
reward calculation
withdrawal settlement
No project should be activated with a term that the payment/staking backend cannot resolve.
13. User-Facing Activation Requirements
Before a project accepts a new user position, the user-facing experience must expose the information required by the Disclosure Standard.
At minimum:
Project identity
Business stage
Funding purpose
Funding target
Use of funds
Current/projected state
Risk information
Liquidity status or applicable liquidity indicator
Staking term
Reward rule
Duration
Capital maturity
Reward withdrawal
Early withdrawal
Fees/penalties, if any
Version/effective date
Relevant project status
The user must be able to review the applicable terms before committing Pi.
14. Admin Authorization
Activation must be restricted to authorized administrative roles and protected by the existing ALBUKHR authentication and elevated-assurance requirements applicable to production administrative actions.
The frontend is not the authority.
The backend/RPC layer must enforce:
correct network
correct project type
permitted previous status
required role
elevated authentication assurance where required
all readiness gates
audit logging
A direct client-side update to projects.status must never be the supported activation path.
15. Activation Snapshot
Every successful activation should preserve the readiness state that justified activation.
The snapshot should be logically traceable to versions of:
funding profile
capital plan
risk assessment
liquidity assessment
disclosure package
staking terms
technical control state
This enables later review of what was known and approved at the time of activation.
16. Post-Activation Monitoring
Activation is not a permanent exemption from controls.
The project remains subject to ongoing monitoring for:
liquidity coverage
treasury reconciliation
payment reconciliation
project status
risk conditions
material disclosure changes
term integrity
suspicious activity
operational incidents
A material breach may trigger:
ACTIVE → RESTRICTED / PAUSED / SUSPENDED
according to the applicable event severity and governance process.
17. Activation Failure
If one or more mandatory gates fail, activation must fail closed.
The system should return a structured readiness result rather than a generic error.
Example:
activation_ready = false

Blocking conditions:
- liquidity_not_ready
- exact_staking_terms_missing
- disclosure_incomplete
This allows Admin/Owner interfaces to show precisely what remains to be completed without granting partial authority.
18. No Silent Bypass
The following are prohibited as normal production mechanisms:
direct status UPDATE from frontend
manually setting ACTIVE to bypass readiness
creating arbitrary reward terms outside the authoritative contract
using Testnet liquidity for Mainnet activation
treating approval as automatic investment eligibility
treating total treasury balance as owner-withdrawable liquidity
changing an existing user's term to make a project activation work
Emergency actions must use a separate, audited emergency-control process rather than silently bypassing the normal activation gates.
19. Implementation Model
The implementation should expose readiness through a server-authoritative workspace/RPC rather than recreating policy in multiple frontends.
Conceptual response:
project
status
project_type
network

funding_ready
risk_ready
liquidity_ready
disclosure_ready
staking_terms_ready
technical_ready

activation_ready
blocking_reasons[]
The final activation RPC then evaluates the same authoritative conditions again at write time.
This prevents a stale UI readiness snapshot from being used to activate a changed project.
20. Existing Systems Must Be Preserved
This standard does not authorize destructive migration of existing staking, transaction, withdrawal or contributor records.
Existing user positions remain governed by the terms under which they were created, subject to the applicable existing contract and legal framework.
New framework implementation must be introduced through additive, versioned and tested migrations wherever possible.
21. Mainnet and Testnet
Mainnet activation and Testnet activation must remain network-isolated.
Testnet may use mirrored project metadata for testing, but must not inherit Mainnet financial positions, user balances, rewards or ledger obligations.
Every authoritative activation/readiness query must validate the intended network.
22. Final Activation Decision Matrix
Gate
Required?
Blocking if Failed?
Identity
Yes
Yes
Approval
Yes
Yes
Funding profile
If funding is offered
Yes
Economic model
Yes
Yes
Risk
Yes
Yes
Liquidity
Before new staking/investment
Yes
Disclosure
Before user commitment
Yes
Staking contract
If staking/investment is offered
Yes
Technical controls
Yes
Yes
Final authorization
Yes
Yes
The exact gate set may be stricter for particular project types or regulated activities.
23. Relationship to Other ALBUKHR Frameworks
This document depends on and should be implemented together with:
ALBUKHR Capital & Funding Model v1.0
ALBUKHR Project Risk Framework v1.0
ALBUKHR Project Disclosure Standard v1.0
ALBUKHR Liquidity & Treasury Framework v1.0
ALBUKHR Staking Contract & Withdrawal Framework v1.0
These documents form the ALBUKHR Project Market Framework v1.
24. Locked Design Decisions
Approval and activation are separate states.
Activation is readiness-based, not UI-based.
No universal reward rate is imposed on every project.
Liquidity readiness is required before new staking/investment.
Project-specific staking terms are authoritative contracts.
Existing user terms cannot be rewritten to facilitate activation.
Core, Internal and External projects have separate activation paths.
Network isolation is mandatory.
Activation decisions must be server-authoritative.
Every activation must be auditable and reproducible from its readiness snapshot.
Failure of a mandatory gate must fail closed.
Existing financial/contributor systems must not be broken merely to introduce this framework.
