ALBUKHR Staking Contract & Withdrawal Framework
Project Market Framework — Version 1.0
Document ID: ALB-PMF-SCW-001
Version: 1.0
Status: Controlled Design Draft
Owner: ALBUKHR Investment Limited
Scope: Mainnet and Testnet project-market architecture
Audience: Product, engineering, project owners, contributors, administrators, compliance/legal reviewers
1. Purpose
This document defines the contract model for project staking/investment positions inside the ALBUKHR Project Market. It translates the approved project funding, liquidity, risk and disclosure framework into a clear user position lifecycle.
The framework is designed around a simple principle:
A user must know the exact terms of a position before committing Pi, and those terms must remain fixed for that position after it is created.
ALBUKHR does not prescribe one universal reward rate or one universal staking duration for all projects. A project may propose its own permitted terms, but the terms must pass the applicable ALBUKHR readiness, liquidity, risk and disclosure controls before publication.
This framework defines the contract and withdrawal rules; it does not itself authorize a project to become ACTIVE.
2. Contract Model
A published staking term is an offer/configuration for a specific project, not a universal ALBUKHR rate card.
A user position is created only after all authoritative conditions are satisfied:
ACTIVE Project + Published Term + User Disclosure Review + User Consent + Valid Pi Payment + Server Confirmation
The canonical contract for a user position must contain a snapshot of the material terms that existed at entry.
At minimum, the position snapshot should preserve:
Project ID
Project code
Network
Project type
Staking term ID/version
Duration
Principal/committed Pi amount
Reward model
Reward rate or reward amount, as defined by the term
Early withdrawal rule
Capital maturity rule
Reward availability rule
Applicable fees/penalties, if any
Start timestamp
Expected maturity timestamp
User acceptance timestamp/version
The contract snapshot must remain available even if the project later publishes new terms.
3. Separation of Three Things
The system must distinguish:
3.1 Published Term
The project-market configuration available for new users.
3.2 User Position
The immutable contract created for one user after successful entry.
3.3 Settlement Event
The later event that changes the financial state of the position, such as reward claim, maturity or capital withdrawal.
A new published term must never silently modify an existing position.
4. Term Status
A staking term should support explicit lifecycle states such as:
DRAFT
UNDER_REVIEW
APPROVED
PUBLISHED
PAUSED
RETIRED
A term can be visible to users only when it is in the appropriate publication state and its parent project is ACTIVE and otherwise eligible.
Retiring a term must stop new entries without changing already-created positions.
5. Project Eligibility Before Staking
A project must satisfy the applicable readiness controls before staking is opened.
At minimum:
Project is ACTIVE.
Network is correct.
Required project disclosures are published.
At least one valid staking term is published.
Required liquidity is available.
Required treasury state is valid.
Reward obligations are supported by the approved liquidity/reward model.
Risk/readiness checks are within required thresholds.
No blocking suspension or pause is active.
The frontend may show a term only for discovery when appropriate, but investment execution must remain server-authoritative.
6. User Pre-Entry Disclosure
Before Pi is committed, the user must be shown the material terms and risks in a readable confirmation step.
The confirmation should include at minimum:
Project
Name
Project code
Type
Business purpose
Funding purpose
Current status
Funding
Target
Current funding state where available
Intended use of funds
Staking Contract
Amount entered
Duration
Reward model/rate/amount
Start condition
Maturity condition
Reward availability
Capital withdrawal rule
Early withdrawal rule
Fees/penalties, if applicable
Risk
Key project risks
Liquidity status
Relevant restrictions
Statement that project performance is not guaranteed
Consent
The user must actively confirm that they have reviewed the applicable terms and disclosures before the payment is finalized.
Passive display alone is not sufficient for a contract that requires explicit acceptance.
7. Entry Lifecycle
The authoritative lifecycle should be:
TERM PUBLISHED
↓
USER REVIEWS DISCLOSURE
↓
USER ACCEPTS TERM VERSION
↓
PI PAYMENT CREATED
↓
SERVER PAYMENT APPROVAL
↓
PI PAYMENT COMPLETED
↓
SERVER VALIDATION
↓
STAKE POSITION CREATED
↓
POSITION ACTIVE
A payment callback or browser event alone must not create a final staking position without server-side validation.
8. Payment Integrity
Investment/staking creation must be idempotent.
The backend must prevent the same Pi payment from creating more than one position.
The transaction flow should validate, as applicable:
Authenticated Pi identity
Mainnet/Testnet network boundary
Project existence
Project ACTIVE status
Term existence and current publication eligibility
Term network
Project/term identity match
Amount
Duration
Payment ID
Transaction ID
Payment completion state
Duplicate payment detection
Treasury/liquidity readiness
Any mismatch must fail safely without creating a new position.
9. Principal / Committed Capital
The principal amount entered into a staking position must be immutable for that position.
The system must distinguish:
Committed Principal from Available User Balance.
While a position is locked, the committed principal is not treated as ordinary spendable or project-owner-withdrawable liquidity.
When a position reaches an eligible maturity state, the principal may become withdrawable according to the published contract.
10. Reward Model
Projects may define their own reward terms within the allowed ALBUKHR framework.
The contract must identify exactly how the reward is determined.
Supported models may include, subject to approved implementation:
Fixed percentage for the term
Fixed Pi reward
Periodic reward schedule
Other explicitly approved deterministic models
The system must not infer a reward rule from frontend labels or manually hard-coded project names.
The reward obligation must be derived from the authoritative term version attached to the position.
11. Reward Capacity and Backing
A project must not publish a staking term that bypasses the required reward/liquidity controls.
Before new staking opens, the system should be able to determine the project's eligible reward-supporting resources according to the liquidity framework.
Where a term allows a reward to be claimed immediately or periodically, the corresponding obligation must be included in the project's liquidity/reward-reserve calculations before new positions are accepted.
No liquidity support → no new term activation.
The framework does not make a project immune from business loss or operational failure; it provides contractual and reserve controls to reduce avoidable settlement risk.
12. Reward Availability Models
Each term must specify one clear reward availability model before entry.
12.1 MATURITY
Reward becomes claimable only when the position reaches the defined maturity condition.
12.2 PERIODIC
Reward becomes claimable according to a disclosed schedule, such as monthly or at defined intervals.
12.3 IMMEDIATE / EARLY CLAIM
A project may support an immediate or early reward claim only where the approved contract and liquidity model explicitly supports it.
The user interface must clearly distinguish:
accrued reward,
claimable reward,
already withdrawn reward,
forfeited/recalculated reward where allowed.
13. Reward Accrual
Reward accounting must use the authoritative position snapshot, not the project's currently published term.
For a fixed-rate percentage contract, the calculation may conceptually be:
Reward = Principal × Contract Rate
However, the implementation must use the exact reward formula defined by the term because future approved models may be more complex.
The system must define whether the stated rate is:
total reward for the entire term,
annualized rate,
periodic rate,
or another explicitly disclosed measure.
The user must never be expected to infer this distinction.
14. Capital Maturity
A position moves through explicit states:
ACTIVE → MATURED → WITHDRAWABLE → SETTLED
The maturity timestamp must be calculated from the authoritative entry/start condition and contract duration.
The system must not derive maturity from the current published term.
Maturity must be deterministic and auditable.
15. Capital Withdrawal
At or after maturity, a user may request capital withdrawal when the position is eligible.
Before settlement, the server must validate:
Position ownership
Network
Position status
Maturity condition
Amount requested
Already withdrawn amount
Applicable liquidity/settlement controls
Duplicate request prevention
A successful capital settlement must create a permanent audit/transaction record.
The same position must not be settled twice for the same principal amount.
16. Reward Withdrawal
Reward withdrawal must be a separate settlement action from principal withdrawal, unless a specific contract deliberately supports a combined settlement event.
The system should support states such as:
ACCRUED → CLAIMABLE → REQUESTED → SETTLED
and, where applicable:
ACCRUED → FORFEITED/RECALCULATED
Any forfeiture or recalculation must be explicitly allowed by the position contract.
The project must not invent a new penalty after the user's position has been created.
17. Early Withdrawal
Early withdrawal rules must be selected and published before the user enters the position.
Supported models may include:
A. Maturity Only
No early capital withdrawal.
B. Early Withdrawal With Published Consequence
Withdrawal is permitted under defined consequences such as reward forfeiture, reward recalculation or an applicable disclosed fee/penalty.
C. Partial Early Withdrawal
Only an eligible portion of the position may be released before final maturity.
The exact consequence must be deterministic and server-enforced.
A project must not change from one early-withdrawal model to another for an existing position.
18. Partial Withdrawal
Where supported by the term, partial withdrawal must track:
Original principal
Locked principal
Withdrawn principal
Remaining principal
Reward associated with the remaining contract, where relevant
The remaining position must preserve the original contract version and rules.
Partial withdrawal must not accidentally close the entire position unless the remaining balance is zero and the contract defines that behavior.
19. Rollover / Reinvestment
Automatic rollover must not be assumed.
A matured position should normally become eligible for settlement rather than silently creating a new contract.
A rollover may occur only through an explicit user instruction where the product supports it.
The new position must receive a new contract ID/term snapshot, even if the user chooses identical terms.
20. Position State Machine
The implementation should support a clear, auditable position state machine.
Recommended states:
CREATED
  ↓
ACTIVE
  ↓
MATURED
  ↓
WITHDRAWABLE
  ↓
SETTLED
Possible exceptional states:
PENDING_CONFIRMATION
CANCELLED
EARLY_WITHDRAWAL_REQUESTED
PARTIALLY_SETTLED
DISPUTED
SUSPENDED
Exceptional states must not erase financial history.
21. Project Pause / Suspension During an Existing Position
A project may become PAUSED, RESTRICTED or SUSPENDED after users have already entered positions.
Project status controls may stop new entries, but they must not silently rewrite existing contract terms.
The system must preserve the original position snapshot and all transaction records.
Any effect of suspension on settlement must be defined by the applicable legal/contractual framework and communicated through the appropriate process.
ALBUKHR must not present suspension as an automatic loss, cancellation or guarantee of recovery.
22. Failed Settlement
If a reward or capital withdrawal cannot be settled immediately, the platform should use an explicit pending/failed/retry-safe state rather than marking the amount as successfully paid.
The system must distinguish:
Requested
Approved
Processing
Settled
Failed
Reversed, where applicable
A failed settlement must not create a false completed transaction.
Retries must be idempotent.
23. User Balance Accounting
The accounting layer should keep distinct conceptual balances for:
Available user balance
Committed/locked principal
Accrued reward
Claimable reward
Withdrawn reward
Withdrawn principal
Pending settlement
The UI may present an aggregate portfolio view, but the underlying accounting records must preserve the distinctions.
24. Project Liquidity Interaction
Every new position must be evaluated against the current project liquidity controls before final commitment.
The applicable checks may include:
Required liquidity
Eligible available liquidity
Reward reserve
Near-term maturity obligations
Withdrawal obligations
Liquidity Coverage Ratio
Project pause/restriction state
A project that fails a blocking liquidity condition must not accept new staking/investment positions.
Existing positions remain separately accounted for.
25. Owner Liquidity and User Capital
Project-owner treasury operations must not treat user committed capital as ordinary owner liquidity.
The system must enforce segregation between:
Project-available liquidity and user contract obligations.
Owner withdrawal logic must calculate the maximum eligible owner-withdrawable amount from authoritative treasury balances rather than trusting an amount entered by the owner.
26. Term Changes and Versioning
Any material change to a published staking term requires a new version.
Material fields include, at minimum:
Duration
Reward model
Reward rate/amount
Minimum stake
Maximum stake
Capital withdrawal rule
Reward withdrawal rule
Early withdrawal rule
Fees/penalties
Funding window
Other terms that materially affect user obligations
Existing positions retain their original version.
The project may retire a term for new users without cancelling positions that already exist.
27. Project Reward Rate Does Not Equal ALBUKHR Guarantee
A displayed reward is a project-specific contract parameter under the applicable ALBUKHR framework.
It must not be presented as:
a guaranteed ALBUKHR return,
a universal Pi Network return,
a risk-free return,
or a promise by ALBUKHR that the underlying business will succeed.
User-facing language must clearly identify who is responsible for the project obligation and what risks apply.
28. User Rights
The user must be able to access, subject to the applicable product and legal controls:
Contract/term version
Principal amount
Entry date/time
Maturity date/time
Reward terms
Reward accrued/claimable
Withdrawal history
Settlement status
Relevant project status
Relevant disclosures
Transaction references
Users must not have to rely on a screenshot or browser state to prove what contract they entered.
29. Auditability
Every material staking event should be traceable through an immutable or append-only audit trail where appropriate.
Events should include, as applicable:
Term publication
Term retirement
User acceptance
Payment creation
Server approval
Payment completion
Position creation
Reward accrual/settlement
Withdrawal request
Withdrawal settlement
Early withdrawal
Partial settlement
Project pause/suspension affecting availability
Administrative actions
Audit records should preserve actor, timestamp, network, project, position and relevant transaction references.
30. Security Requirements
The authoritative staking/withdrawal contract must not depend on:
LocalStorage for financial state
Client-side project status as an authority
Client-side reward calculation as the settlement authority
Client-supplied ownership claims
Browser-only payment callbacks
Arbitrary owner-entered withdrawal limits
The server/database layer must validate sensitive transitions.
Mainnet and Testnet must remain isolated.
31. Mainnet / Testnet Boundary
A Mainnet position must never be created from Testnet configuration or payment context.
A Testnet position must never create or settle a Mainnet financial obligation.
All position, term, treasury, payment and withdrawal operations must carry or derive a verified network boundary.
Testnet may be used to test the same contract mechanics, but Testnet records have no authority over Mainnet positions.
32. Current ALBUKHR Architecture Alignment
The current Mainnet staking flow already follows the principle that investment requires an ACTIVE project and is server-authoritative.
The current implementation also routes Pi payment approval/completion through the ALBUKHR API and uses Mainnet project identity before creating a stake.
The existing database contract currently uses an exact project-code match to resolve the applicable staking term. This framework does not authorize changing that behavior yet.
Before migrating current terms, engineering must confirm the canonical identity model and then preserve compatibility for existing positions.
No existing user's financial position should be invalidated or re-priced solely because the framework is being introduced.
33. Migration Rule for Existing Positions
When this framework is implemented, existing positions must be treated as historical contracts.
The migration must not:
change their reward rate,
change their duration,
change maturity,
create duplicate positions,
recalculate historical rewards without an explicit approved rule,
or replace old contract references with a new version while losing the original terms.
Where old data lacks a formal term-version ID, migration should create a historical representation from the actual authoritative data available at the time, subject to verification.
34. Implementation Requirements
The implementation should proceed in this order:
Phase 1 — Contract Data Model
Establish or extend authoritative records for:
Staking term
Term version
User position
Position snapshot
Reward state
Withdrawal request
Settlement event
Phase 2 — Server Rules
Implement server-authoritative checks for:
Eligibility
Term validity
Liquidity
Payment integrity
Position creation
Maturity
Reward settlement
Capital withdrawal
Early withdrawal
Idempotency
Phase 3 — API
Expose only the required authenticated operations.
Phase 4 — User UI
Display contract, risk, liquidity and withdrawal information from authoritative records.
Phase 5 — Migration Audit
Audit all current staking/withdrawal dependencies before changing existing database functions or terms.
35. Required Future Functions / Services
Names are design concepts and must be reconciled with the existing ALBUKHR schema before implementation.
Potential service boundaries include:
get_project_staking_terms
get_staking_term_version
create_user_stake
get_user_positions
get_user_position
calculate_position_reward
request_reward_withdrawal
request_capital_withdrawal
settle_reward_withdrawal
settle_capital_withdrawal
request_early_withdrawal
settle_partial_withdrawal
reconcile_staking_position
These must not be added merely because the names appear here. Existing authoritative functions should be reused or evolved where safe.
36. Safety Invariants
The following invariants must hold:
A user cannot create a new position for a project that is not eligible for staking.
A position cannot reference a term from another project.
A position cannot mix Mainnet and Testnet data.
A payment cannot create multiple positions.
A position cannot be settled twice for the same obligation.
Existing position terms cannot be silently changed.
Owner withdrawals cannot consume restricted user obligations.
A failed settlement cannot be recorded as successful.
Reward settlement cannot exceed the authoritative contractual reward.
Capital settlement cannot exceed the user's remaining eligible principal.
Client-side calculations cannot override server-side settlement rules.
A project pause must not erase existing position history.
New terms must not retroactively modify old positions.
No automatic rollover may occur without explicit user authorization.
All financial writes must remain network isolated.
37. Relationship to Other ALBUKHR Project-Market Documents
This document must be implemented together with:
ALBUKHR Capital & Funding Model v1.0
ALBUKHR Project Risk Framework v1.0
ALBUKHR Project Disclosure Standard v1.0
ALBUKHR Liquidity & Treasury Framework v1.0
ALBUKHR Project Market Activation Standard v1.0
The documents form one coordinated system.
A staking contract must not be activated merely because its UI exists. It must satisfy the project-market readiness conditions established by the other framework documents.
38. Regulatory and Platform Boundary
This document is a product/technical framework and is not legal advice or evidence of regulatory authorization.
Because staking/investment-like participation can have legal and regulatory implications, the final Mainnet implementation must be reviewed against applicable Nigerian law and regulatory requirements before public operation.
The implementation must also remain within applicable Pi Network platform/developer requirements.
39. Design Decisions Locked by This Version
Each user position receives an immutable contract snapshot of material terms.
Project staking terms are project-specific and subject to ALBUKHR validation.
ALBUKHR does not prescribe one universal reward rate for every project.
Reward availability must be explicitly defined per term.
Capital maturity must be deterministic and contract-based.
Early withdrawal rules must be disclosed before entry.
Principal and reward settlement are separately accounted for.
Partial withdrawal is supported only where the published term permits it.
Automatic rollover is not permitted without explicit user authorization.
Payment and settlement operations must be idempotent.
Existing positions must survive framework migration without silent repricing or invalidation.
Project liquidity failure must block new activity where the applicable controls require it.
User committed capital is not owner-withdrawable liquidity.
Mainnet and Testnet financial contracts remain isolated.
No current staking term migration is authorized by this document alone.
40. Next Required Document
The next controlled document is:
ALBUKHR Project Market Activation Standard v1.0
It will combine project approval, funding readiness, liquidity readiness, risk readiness, disclosure readiness and staking-contract readiness into the final server-authoritative gate that determines when a project may move from APPROVED/READY into ACTIVE.
