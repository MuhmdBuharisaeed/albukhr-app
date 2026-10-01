ALBUKHR Liquidity & Treasury Framework
Project Market Framework — Version 1.0
Document ID: ALB-PMF-LTF-001
Version: 1.0
Status: Controlled Design Draft
Owner: ALBUKHR Investment Limited
Scope: Mainnet and Testnet project-market architecture
Related Documents: Capital & Funding Model v1.0; Project Risk Framework v1.0; Project Disclosure Standard v1.0
1. Purpose
The ALBUKHR Liquidity & Treasury Framework defines how project funds are classified, protected, reconciled and made available for legitimate project activity and user obligations.
The central principle is:
No project may open new staking/investment activity unless the applicable liquidity, treasury and settlement requirements for that activity have been satisfied and verified.
Liquidity is not treated as a single balance. The platform must distinguish project operating resources from user-committed capital, reward obligations, restricted reserves and any escrowed resources.
This framework is designed to protect users without preventing legitimate projects from using capital for productive economic activity.
2. Economic Objective
ALBUKHR projects exist to connect Pi holders with real economic activities. Projects may use capital to establish, operate, expand or improve businesses such as manufacturing, agriculture, food processing, water production, transportation, pharmacies, shops and technology activities.
Treasury controls therefore have two simultaneous objectives:
Permit legitimate deployment of capital into the project's disclosed economic purpose.
Preserve sufficient eligible resources to meet user obligations under published staking/investment terms.
Liquidity controls must not be designed as an assumption that all project funds are permanently idle. The framework must distinguish productive deployment from unavailable or restricted liquidity.
3. Core Principle: Project Balance Is Not One Pool
A project's total Pi balance must never be interpreted as automatically withdrawable or available for new obligations.
Conceptually:
Total Project-Controlled Resources
→ Operating Capital
→ User-committed Capital
→ Reward Reserve
→ Required Liquidity Reserve
→ Emergency/Contingency Reserve
→ Escrowed/Restricted Funds
→ Other Legally or Contractually Restricted Resources
Only the portion explicitly classified as eligible owner-withdrawable liquidity may be withdrawn by the project owner, and only through authorized treasury controls.
4. Treasury Balance Classes
4.1 Operating Capital
Resources allocated for the project's disclosed business activity.
Examples:
Machinery
Raw materials
Production
Logistics
Salaries/operating expenses where permitted and disclosed
Inventory
Expansion activity
Other approved business uses
Operating capital may be deployed according to the approved capital plan, but deployment must not bypass user-obligation or restricted-balance controls.
4.2 User-Committed Capital
Pi associated with active user staking/investment positions and subject to the applicable contract.
This balance is not owner-withdrawable simply because it appears inside the project's treasury.
4.3 Reward Reserve
Eligible resources reserved to meet published reward obligations.
Where a project promises a reward at or from the beginning of a staking term, the corresponding reserve requirement must be recognized before the relevant staking activity is opened.
4.4 Required Liquidity Reserve
Eligible, sufficiently liquid resources maintained to satisfy the project's defined near-term user obligations and any other obligations recognized by the applicable liquidity model.
4.5 Emergency / Contingency Reserve
Resources maintained to absorb defined operational or liquidity shocks where the project's approved risk model requires them.
4.6 Escrowed / Restricted Funds
Funds subject to a legal, contractual or system restriction that prevents ordinary owner withdrawal or unrestricted deployment.
External-project structures may require stronger segregation and escrow/custody arrangements before activation.
5. Eligible Liquidity
For ALBUKHR purposes, eligible liquidity is not synonymous with total treasury balance.
Eligible liquidity must be:
identifiable,
reconciled,
available within the applicable settlement horizon,
not already committed to an incompatible obligation,
not locked user capital that is unavailable for the specific obligation being tested,
not an escrowed/restricted amount where the restriction prevents the proposed use,
assigned to the correct network,
supported by authoritative ledger/treasury records.
The exact liquidity eligibility calculation is an implementation concern of the Liquidity Engine and must remain server-authoritative.
6. Liquidity Readiness Before Staking
The framework establishes:
NO VERIFIED LIQUIDITY READINESS → NO NEW STAKING/INVESTMENT.
Before a project term becomes available to users, the system must verify the applicable readiness conditions, including where relevant:
project is Active under the correct project-type lifecycle,
treasury exists and is in an allowed operating state,
required treasury wallet/configuration is valid,
required liquidity is configured,
required liquidity has been verified,
reward obligations are covered according to the approved term model,
no blocking risk or compliance state exists,
the term is approved and effective,
network is correct.
The verification must occur on the authoritative backend/financial layer. Client-side values must never be treated as proof of liquidity.
7. Reward Liquidity Principle
A project must not publish a staking arrangement on the assumption that future investor deposits will create the liquidity required to satisfy already-promised reward obligations in a manner that conflicts with applicable law or ALBUKHR anti-fraud rules.
Where the approved staking contract makes a reward obligation known at the time of entry, the liquidity model must account for that obligation before or at the point the position is accepted, according to the approved settlement architecture.
This creates a key rule:
New user staking must not be the sole source of the liquidity that makes the same new user's promised reward appear solvent.
The economic source of rewards must be consistent with the project's disclosed business model and approved treasury structure.
8. Liquidity Coverage Ratio
The platform should calculate a project-specific liquidity coverage metric.
Conceptually:
Liquidity Coverage Ratio (LCR)
= Eligible Available Liquidity / Eligible Upcoming Obligations
Eligible upcoming obligations may include, as defined by the applicable project model and contract terms:
matured user capital,
approved withdrawal requests,
claimable or due rewards,
other contractual obligations due within the measurement horizon.
The measurement horizon and minimum thresholds must be defined by the separate ALBUKHR Risk & Liquidity implementation standard. This framework does not prescribe a universal numeric LCR threshold.
9. Liquidity Buckets and Obligations
To prevent misleading totals, liquidity should be assessed by obligation horizon.
Immediate / Near-Term
Obligations that may become due within the immediate settlement window.
Short-Term
Obligations due within the project's defined short-term horizon.
Maturity Liquidity
Capital obligations expected to become due at user-term maturity.
Reward Liquidity
Resources required for reward settlement according to the term contract.
Restricted Resources
Resources present in the treasury but unavailable for the obligation under review.
A project may therefore have a positive total treasury balance while still being liquidity-constrained.
10. Capital Cycle Matching
Liquidity requirements should be linked to the project's economic cycle.
Examples:
Build Project
Capital may be deployed through:
Funding → Setup → Procurement → Construction/Installation → Commissioning → Production → Revenue
Liquidity must account for the fact that significant capital may remain deployed before revenue begins.
Growth Project
A functioning business may have:
Existing Revenue → Expansion Capital → Capacity Increase → Additional Revenue
Historical operating information may provide additional evidence, but it does not remove liquidity risk.
Working-Capital Project
A shorter cycle may be:
Funding → Inventory/Inputs → Production/Sales → Receipts → Replenishment
The liquidity model should reflect the actual disclosed cycle rather than imposing one universal duration on all projects.
11. Owner-Withdrawable Liquidity
A project owner may only withdraw resources explicitly classified by the treasury engine as:
AVAILABLE_OWNER_WITHDRAWABLE
The calculation should exclude, where applicable:
user-committed capital,
required liquidity reserve,
reward reserve,
matured-but-unsettled user obligations,
approved withdrawal obligations,
escrowed/restricted funds,
disputed or reconciliation-pending funds,
funds reserved for authorized pending deployment where the applicable rules classify them as restricted.
The owner must not be able to bypass this calculation by submitting an arbitrary withdrawal amount.
12. Owner Liquidity Withdrawal Workflow
The preferred workflow is:
Owner Request → Identity/Authorization Check → Treasury Eligibility Check → Liquidity Recalculation → Risk/Restriction Check → Approval/Settlement → Ledger Entry → Audit Event
For higher-risk amounts or conditions, the system may require an additional approval step.
Every owner withdrawal must be:
network-specific,
project-specific,
authenticated,
authorized,
idempotent,
recorded in the authoritative ledger,
represented in the treasury history,
auditable.
No frontend-only balance calculation may authorize a withdrawal.
13. Staking Admission Control
When a user starts a new staking/investment position, the system must evaluate the project and term again at the point of acceptance.
The admission sequence should conceptually be:
Project Active → Term Active → Treasury Valid → Liquidity Valid → Risk/Restriction Clear → User Eligible → Payment Valid → Position Created
If a blocking condition is detected, the transaction must fail safely and must not create a partial staking record.
14. Post-Staking Reconciliation
After an accepted position is created:
the project treasury must reflect the resulting movement,
the user's position must have an authoritative transaction reference,
the applicable reward/liability record must be established,
the project liquidity metrics must be recalculated,
all related records must remain network-isolated.
A project must not be shown as healthy using stale liquidity values after a material treasury movement.
15. Withdrawal Priority / Settlement Waterfall
The exact waterfall is implementation-specific, but the model should recognize priority of contractual and restricted obligations.
A conceptual order is:
Resolve reconciliation/security holds.
Preserve restricted/escrowed balances.
Protect required user-liquidity reserves.
Settle due user obligations according to contract.
Preserve required reward/liquidity capacity.
Determine any genuinely available owner-withdrawable liquidity.
This sequence prevents owner withdrawals from consuming resources needed for existing user obligations.
16. Liquidity Breach States
Projects should have explicit operational states separate from ordinary project approval.
HEALTHY
Liquidity and treasury controls meet the applicable requirements.
RESTRICTED
A material liquidity or control condition requires reduced permissions.
Possible effects:
new staking disabled,
owner withdrawals reduced or blocked,
additional verification required.
PAUSED
New staking/investment activity is stopped while the condition is investigated or resolved.
SUSPENDED
Project activity is suspended due to a material issue under the applicable governance rules.
CLOSED
The project is no longer accepting new activity and enters its defined wind-down/settlement process.
Changing to a restrictive state must not silently delete or rewrite existing user records.
17. Liquidity Breach Does Not Automatically Rewrite User Contracts
If liquidity falls below a required threshold after users have already entered positions:
existing contractual records must remain intact,
the original term version must remain traceable,
the system must not silently reduce published rewards,
the system must not silently extend maturity,
the system must not convert user capital into an owner balance,
applicable suspension/recovery procedures must be followed.
Any extraordinary legal or contractual remediation must be handled through an authorized process and disclosed appropriately.
18. Treasury Reconciliation
The treasury engine must support reconciliation among the authoritative records that represent:
project treasury,
transaction ledger,
user staking positions,
reward liabilities/settlements,
withdrawal requests and settlements,
project funding movements,
escrow/restricted balances where applicable.
At minimum, reconciliation should detect:
missing movements,
duplicate movements,
balance mismatches,
stale status,
network mismatch,
project mismatch,
unauthorized treasury activity.
A reconciliation failure should be capable of becoming a blocking condition for additional activity when material.
19. Idempotency and Settlement Safety
Treasury operations must be safe against retries and duplicate requests.
Operations such as:
deposit confirmation,
reward settlement,
capital withdrawal,
owner liquidity withdrawal,
escrow release,
treasury allocation
must use authoritative transaction/operation identifiers and idempotent processing rules.
A repeated client request must not create duplicate financial settlement.
20. Core, Internal and External Treasury Models
Core
Core projects are governed by ALBUKHR's Core treasury and activation controls. Core liquidity and activation must remain server-authoritative.
Internal / Contributor
Internal projects require controls tied to the contributor/project relationship and the approved internal project lifecycle.
Where contributor-owned project funds are involved, the treasury model must preserve the distinction between project owner resources and user obligations.
External
External projects require additional ownership, due-diligence and investor-protection controls. Where the platform handles investor funds for a third-party project, the required escrow/custody structure must be defined and legally reviewed before activation.
The three project types must not be reduced to one generic unrestricted treasury model.
21. Existing project_treasury Architecture
The current Mainnet architecture already contains a project_treasury concept with project-level treasury configuration, required/verified liquidity and treasury status.
This framework does not authorize replacing that table or rewriting existing treasury records merely to adopt the policy document.
The implementation task is to map the policy concepts to the existing schema first and identify only the missing fields/controls required for production readiness.
Existing constraints that enforce Mainnet treasury configuration must remain intact unless a controlled migration proves that a change is required.
22. Network Isolation
Treasury and liquidity are network-scoped.
Mainnet liquidity cannot satisfy Testnet obligations.
Testnet liquidity cannot satisfy Mainnet obligations.
All treasury reads/writes and financial RPCs must enforce the active network server-side.
Testnet project-registry mirroring must never imply that Mainnet treasury balances, staking positions, rewards or withdrawal obligations have been copied into Testnet.
23. Disclosure of Liquidity to Users
Users should not receive a single unexplained number labelled simply "Project Liquidity".
Where displayed, the interface should distinguish information such as:
funding target,
capital raised,
eligible liquidity status,
liquidity health indicator,
relevant restrictions,
project status,
term status.
The methodology should avoid displaying restricted/user-committed funds as owner-available cash.
Liquidity indicators are informational and must not be presented as a guarantee that the project cannot fail or that a user cannot lose funds.
24. Prohibited Treasury Behavior
Projects must not:
withdraw user-restricted funds as owner liquidity,
create artificial or misleading liquidity,
misrepresent restricted funds as available funds,
recycle accounting entries to create false balances,
use one network's funds for another network's obligations,
bypass server-side treasury controls,
conceal material liquidity shortages,
fabricate treasury records,
manipulate liquidity metrics,
use investor funds for undisclosed purposes,
create duplicate settlement transactions.
Material violations may trigger restriction, suspension, investigation or other action under ALBUKHR rules and applicable law.
25. Emergency Liquidity Controls
The platform should support emergency controls that can be activated by authorized governance/financial/security roles.
Potential triggers include:
critical reconciliation failure,
unauthorized treasury movement,
suspected fraud,
severe liquidity deficit,
security incident,
regulatory/legal intervention,
material project disclosure failure.
Emergency controls should be narrowly scoped to the affected project/network/function and must create an auditable event.
26. No Universal Liquidity Percentage
ALBUKHR must not impose one universal liquidity percentage on every project merely because projects have different economic models.
The required liquidity should be derived from the approved project model, including:
project stage,
funding purpose,
capital cycle,
staking duration,
reward obligations,
withdrawal model,
maturity concentration,
project risk,
expected obligations,
operational reserve requirements.
The numeric thresholds belong in the detailed ALBUKHR Risk & Liquidity implementation specification after testing and legal/compliance review.
27. Relationship With Reward Capacity
Liquidity is a constraint on reward capacity, but liquidity alone does not prove that a reward model is economically sustainable.
The project-market engine must evaluate both:
Economic Capacity
and
Liquidity Capacity
A project may have liquidity today but still have an unsupported reward structure. Conversely, a plausible business model may still be unable to meet near-term withdrawals without adequate liquidity.
Therefore:
Reward Capacity = Economic Model + Risk Assessment + Liquidity Capacity + Contract Structure
This output should feed the Staking Contract Framework rather than being hidden inside the treasury table.
28. Activation Readiness
A project should be considered ready for user staking only when the required conditions are simultaneously satisfied.
Conceptually:
Approval

Business/Funding Readiness

Risk Readiness

Disclosure Readiness

Terms Readiness

Treasury Readiness

Liquidity Readiness

Financial/Settlement Readiness
=
Eligible for Activation
Activation remains a server-authoritative state transition.
29. Implementation Principles
The production implementation must follow these rules:
No direct frontend write may alter project liquidity status.
No owner-supplied balance may be treated as verified liquidity without authoritative settlement evidence.
No new staking transaction may bypass liquidity admission checks.
No owner withdrawal may bypass restricted-balance calculations.
All treasury operations must be network-aware.
All material treasury operations must be auditable.
All financial settlement operations must be idempotent.
Existing user positions must remain compatible with their original contract terms.
Existing financial data must not be rewritten merely to introduce this framework.
Policy thresholds must not be hard-coded in multiple frontends; they belong in the authoritative risk/liquidity layer.
30. Regulatory and Platform Boundary
This document is an ALBUKHR product/technical policy draft. It is not legal advice and does not itself establish regulatory authorization.
Nigeria's SEC currently maintains rules and registration materials relevant to crowdfunding, digital assets and other capital-market activities. The SEC's May 2026 public notice specifically cautions the public against unregistered online investment schemes and unrealistic or guaranteed returns, and states that only entities registered by the Commission are authorised to promote investment services, provide investment advisory services or solicit funds from the public in the Nigerian capital market. citeturn473160search0turn473160search4
The Investment and Securities Act, 2025 is the current statute published by the Federal Government and made available by the SEC. citeturn473160search1turn473160search35
Pi Network states that use of its Developer tools/resources is subject to the Pi Network Developer Terms of Use. citeturn473160search2
The production ALBUKHR model must therefore undergo qualified Nigerian legal/regulatory review and appropriate Pi platform compliance review before public investment operations are treated as production-ready.
31. Design Decisions Locked by This Version
Project treasury is not one unrestricted balance.
User-committed capital is not automatically owner-withdrawable.
Reward obligations require explicit treasury/liquidity treatment.
No verified liquidity readiness means no new staking/investment.
Liquidity thresholds are project-sensitive and are not one universal percentage.
Owner withdrawals are limited to calculated eligible owner-withdrawable liquidity.
Liquidity breaches can restrict new staking and owner withdrawals.
Liquidity breaches do not silently rewrite existing user contracts.
Treasury operations must be server-authoritative, idempotent and auditable.
Core, Internal and External treasury governance remains distinct.
Mainnet and Testnet treasury resources remain strictly isolated.
Existing project_treasury architecture must be mapped before schema changes are made.
Reward capacity must consider both economics and liquidity.
No production project should become ACTIVE solely because a UI exposes an activation action.
32. Next Required Document
The next controlled document should be:
ALBUKHR Staking Contract & Withdrawal Framework v1.0
It will convert the project-market framework into the actual user contract model, defining:
staking position lifecycle,
term versioning,
reward calculation,
reward settlement,
capital maturity,
normal withdrawal,
early withdrawal,
partial withdrawal,
forfeiture/recalculation rules where permitted,
rollover/renewal,
failed settlement handling,
user consent,
immutable terms,
position-level auditability.
No current production reward rates should be changed solely because this framework has been created.
