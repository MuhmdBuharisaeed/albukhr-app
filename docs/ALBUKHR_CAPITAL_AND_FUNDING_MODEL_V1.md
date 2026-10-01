ALBUKHR Capital & Funding Model
Project Market Framework — Version 1.0
Document ID: ALB-PMF-CFM-001
Version: 1.0
Status: Controlled Design Draft
Owner: ALBUKHR Investment Limited
Scope: Mainnet and Testnet project-market architecture
Audience: Product, engineering, project owners, contributors, administrators, compliance/legal reviewers
1. Purpose
The ALBUKHR Project Platform exists to connect Pi holders with real economic activities operated through eligible projects, with an emphasis on supporting small-scale industries, shops, stores, production businesses, agriculture, transport, water production, food processing, technology and other productive activities.
The platform is intended to provide a structured way for eligible projects to present their capital requirements and for eligible users to participate through project-specific staking or investment contracts, subject to the applicable ALBUKHR rules, risk controls, disclosures, liquidity requirements and legal/regulatory review.
ALBUKHR is therefore not designed to prescribe one universal reward rate or one universal business model for every project. Instead:
The project defines its business purpose, funding purpose and proposed staking terms.
ALBUKHR defines and enforces the market framework, minimum controls, disclosure requirements, liquidity requirements, risk controls and investor-protection rules.
The final investment/staking contract is accepted only when the project satisfies the applicable readiness requirements.
This document defines the capital and funding model that sits between a project's business plan and its staking terms.
2. Core Principle
The ALBUKHR project-market decision chain is:
Business → Business Stage → Funding Purpose → Capital Requirement → Capital Deployment → Economic Model → Risk → Liquidity → Reward Capacity → Staking Terms → Disclosure → Readiness → Activation
A project must not move directly from:
"I need Pi" → "I will pay X% reward" → "Open staking"
without establishing the economic and risk information that supports the proposed terms.
3. Project Funding Is Not Uniform
Projects may seek capital for different reasons. The platform must distinguish the economic purpose of the requested capital.
A project may already have a functioning business and seek expansion capital. Another may be starting from zero. A third may require short-cycle working capital. These cases must not be treated as identical.
The primary funding models are:
3.1 BUILD — New Business / Greenfield
Capital is used to establish a new business, facility, production line or operating activity that is not yet commercially operational.
Typical uses:
Factory or shop setup
Machinery
Production equipment
Initial inventory
Initial working capital
Initial operating reserve
Required liquidity reserve
Regulatory or operational setup costs
Primary risk characteristics:
Execution risk
Construction/setup risk
Operational-start risk
Market-demand uncertainty
Revenue uncertainty
3.2 GROW — Existing Business Expansion
Capital is used to expand a business that is already operating.
Typical uses:
Additional machinery
Production-capacity expansion
New distribution network
Additional vehicles
New branch
Larger inventory
Expansion working capital
Technology upgrade
Required evidence should normally include current operating information and historical performance, where applicable.
Primary risk characteristics:
Expansion execution risk
Demand/capacity mismatch
Operating-cost risk
Liquidity risk
Market risk
3.3 OPERATE — Working Capital
Capital is used to support recurring business operations over a defined cycle.
Typical uses:
Raw materials
Inventory
Short-cycle production
Distribution
Operating expenses directly linked to a disclosed business cycle
The project must disclose the expected cycle duration and how the capital will be deployed and replenished.
3.4 ASSET — Equipment or Productive Asset
Capital is primarily allocated to a clearly identified productive asset.
Examples:
Machinery
Vehicle
Processing equipment
Water-production equipment
Solar/energy equipment
Storage infrastructure
The asset must be identified and its purpose disclosed.
3.5 BRANCH — New Location / Distribution Expansion
Capital is used to create a new branch, outlet, distribution point or additional operating location for an existing business.
The project should disclose:
Current operations
Existing locations
Proposed new location
Setup cost
Expected operational date
Expected contribution to business capacity
3.6 PRODUCT — Product or Service Expansion
Capital is used to launch or expand a new product/service within an existing business.
The project should disclose:
Existing product/service
New product/service
Required capital
Development/production process
Expected launch timeline
Key execution assumptions
3.7 RESTRUCTURE — Eligible Business Restructuring
This model may be used only where ALBUKHR's applicable rules permit it and where the purpose is transparent and verifiable.
The project must disclose why restructuring is required, what liabilities/obligations are affected, and how investor funds will be segregated from pre-existing obligations.
4. Business Stage
Funding purpose and business stage are separate attributes.
The platform should support at least:
CONCEPT — Business concept or planning stage.
SETUP — Facility, equipment or operating infrastructure is being established.
PRE_OPERATION — Operational setup is substantially complete but commercial activity has not started or is not yet established.
OPERATING — Business is actively operating.
EXPANSION — Existing operating business seeking growth capital.
MATURE — Established business with operating history seeking additional eligible capital.
A project may have:
business_stage = OPERATING
and
funding_purpose = EXPANSION
This is materially different from:
business_stage = SETUP
and
funding_purpose = STARTUP/BUILD
5. Capital Requirement
Every project seeking capital must state:
Total funding target
Minimum funding target, if applicable
Maximum funding target, if applicable
Funding window
Currency/unit (Pi)
Intended use of funds
Capital deployment schedule
Required reserve
Required investor-liquidity reserve
Relevant dependencies and assumptions
The requested amount must be supported by an itemized funding plan.
Example — New Facility
Use of Funds
Pi
Machinery
45,000
Facility setup
15,000
Packaging equipment
10,000
Initial raw materials
10,000
Working capital
10,000
Reserve
10,000
Total
100,000
Example — Existing Business Expansion
Use of Funds
Pi
Additional production line
40,000
Packaging equipment
20,000
Delivery/logistics asset
15,000
Inventory/raw materials
10,000
Expansion working capital
10,000
Liquidity reserve
5,000
Total
100,000
The examples are illustrative only. They are not prescribed allocation percentages.
6. Before-Funding and After-Funding Model
Projects should disclose the economic state before and after funding.
6.1 Before Funding
Where relevant:
Current production
Current sales volume
Current customer base
Current revenue
Current operating costs
Existing assets
Existing capacity
Existing locations
Operating history
Existing obligations relevant to the project
6.2 Funding Deployment
The project must state how the requested Pi will be deployed.
6.3 Expected Post-Funding State
The project should state, where reasonably estimable:
Expected production capacity
Expected sales capacity
Expected new locations/customers
Expected operating improvements
Expected revenue impact
Expected cost impact
Expected date of operational effect
Projects must distinguish clearly between:
historical/actual figures,
current figures,
management assumptions,
forecasts.
Forecasts must not be presented as historical facts.
7. Capital Deployment Schedule
Capital must have a declared deployment lifecycle.
A project may use:
Funding Raised → Held/Restricted → Approved Deployment → Deployed → Operating/Generating Economic Activity → Reconciliation
For projects requiring staged deployment, ALBUKHR should support milestone-based deployment where appropriate.
Examples:
Stage 1: equipment procurement
Stage 2: installation
Stage 3: commissioning
Stage 4: production
Stage 5: distribution
Staged deployment should be preferred where a project has meaningful execution dependencies.
8. Treasury Separation
Project balances must not be treated as one undifferentiated pool.
The treasury model should conceptually separate:
8.1 Operating Capital
Pi allocated to legitimate project operations.
8.2 Committed Investor Capital
Pi associated with user staking/investment positions and subject to the applicable lock/maturity rules.
8.3 Reward Reserve
Pi or other eligible settlement resources designated for project obligations relating to published rewards, where applicable.
8.4 Required Liquidity Reserve
Pi maintained to support eligible user obligations.
8.5 Emergency / Contingency Reserve
Where required by the project's risk model, a reserve for unexpected operational or liquidity events.
These categories must not be represented as freely withdrawable owner funds.
9. No Liquidity — No Staking
A project must satisfy the applicable liquidity-readiness requirements before new user staking/investment is opened.
This does not mean that every project must hold an identical reserve amount. The required reserve should be determined through the ALBUKHR liquidity framework based on factors such as:
Project model
Funding cycle
Staking duration
Capital maturity profile
Reward obligations
Withdrawal rules
Expected obligations
Risk controls
Project-specific liquidity structure
10. Liquidity Coverage
The platform should maintain a measurable relationship between eligible liquidity and near-term eligible obligations.
Conceptually:
Liquidity Coverage Ratio = Eligible Available Liquidity / Eligible Upcoming Obligations
Eligible upcoming obligations may include:
Matured capital
Approved withdrawals
Claimable rewards
Other contractually due project obligations recognized by the framework
The exact minimum threshold should be defined by the ALBUKHR Risk & Liquidity Framework after legal/compliance review and system validation.
When a project falls below its required liquidity threshold, the system should be capable of:
Preventing additional staking
Restricting certain treasury withdrawals
Marking the project as liquidity-restricted
Escalating the condition for administrative review
Existing user contractual records must not be silently altered because a project becomes restricted.
11. Project-Owned Liquidity Withdrawal
A project owner may have a right to withdraw eligible project-owned liquidity only within the rules of its approved treasury structure.
Owner withdrawals must never consume:
User locked capital
Required investor liquidity
Allocated reward reserve
Escrowed funds
Other restricted balances
The platform must calculate:
Available Owner-Withdrawable Liquidity
rather than allowing the owner to enter an arbitrary withdrawal amount.
Every owner liquidity withdrawal must be:
Authorized
Network isolated
Treasury validated
Recorded in the audit trail
Reconciled against ledger balances
Subject to any applicable role/MFA controls
12. Economic Model
The project must provide a business/economic explanation for its funding request.
Depending on the project type, this may include:
Revenue model
Cost model
Production model
Distribution model
Sales cycle
Inventory cycle
Customer-payment cycle
Expected operating margin assumptions
Capital turnover cycle
Expansion assumptions
For existing businesses, historical information should be used where available.
For new businesses, assumptions and projections must be clearly identified as projections.
13. Reward Capacity
ALBUKHR should not prescribe a single reward percentage for all projects.
The project may propose its own staking terms within permitted ALBUKHR constraints.
However, the proposed reward must be evaluated against:
Funding purpose
Business stage
Capital cycle
Cash-flow assumptions
Required liquidity
Reward reserve
Risk profile
Funding target
Duration
Other project obligations
The objective is not to guarantee that a project can pay a reward. The objective is to prevent unsupported, misleading or structurally unsustainable reward terms from being published without appropriate review.
A project's reward rate is therefore a project-specific contractual parameter subject to ALBUKHR validation, not a universal ALBUKHR promise.
14. Staking Term Structure
Each project may have one or more published terms.
A term should contain, at minimum:
Project identity
Network
Duration
Minimum stake
Maximum stake, if applicable
Reward model
Reward rate/amount
Early withdrawal rule
Capital maturity rule
Reward claim/withdrawal rule
Applicable fees/penalties, if any
Funding window
Term status
Version
Effective date
Immutable Contract Principle
Once a user enters a term, that user's contract terms must remain fixed for that position.
A later change to the project's published terms must not silently rewrite an existing user's:
Duration
Reward
Minimum/maximum
Withdrawal rules
Maturity conditions
New terms should be published as a new version.
15. Early Withdrawal Models
A project may select an ALBUKHR-approved withdrawal model.
Possible models include:
Model A — Maturity Only
Capital remains locked until maturity.
Model B — Early Withdrawal With Published Consequence
Early withdrawal is possible under clearly disclosed rules, which may include reward forfeiture, recalculation or an applicable fee/penalty.
Model C — Partial Withdrawal
Only eligible portions of a position may be withdrawn before final maturity.
The project must select and publish the model before a user enters the term.
ALBUKHR must not allow a project to introduce a new early-withdrawal consequence after users have already entered the contract.
16. Reward Withdrawal
Reward must be represented separately from principal/committed capital in the staking accounting model.
The system should distinguish:
Accrued reward
Eligible/claimable reward
Withdrawn reward
Forfeited/recalculated reward, where explicitly permitted by the published term
A user must be able to understand why a reward is or is not currently withdrawable.
17. Capital Withdrawal
At maturity:
Locked Position → Matured Position → Capital Eligible for Withdrawal
The exact settlement state must be recorded before capital is released.
The platform should also support, where the applicable term allows it:
Partial withdrawal
Full withdrawal
Automatic rollover only with explicit user authorization and clear disclosure
No automatic reinvestment should occur without a documented user instruction/consent flow.
18. Risk Framework
Risk should be assessed using multiple dimensions rather than one unexplained score.
The minimum framework should consider:
Business Risk
Business model
Industry
Competition
Operating history
Demand assumptions
Execution Risk
Construction/setup
Procurement
Implementation dependencies
Operational readiness
Financial Risk
Revenue uncertainty
Cost uncertainty
Existing obligations
Capital requirements
Liquidity Risk
Reserve
Maturity concentration
Withdrawal exposure
Liquidity coverage
Operational Risk
Owner/operator controls
Facilities
Suppliers
Logistics
Technology
Governance Risk
Ownership
Authority
Segregation of responsibilities
Related-party/conflict considerations
Fraud and Abuse Risk
Identity integrity
Duplicate project behavior
Manipulated activity
Circular funding patterns
Misleading claims
Suspicious transaction activity
The methodology, thresholds and formulas should be defined in the separate ALBUKHR Project Risk Framework rather than hidden inside frontend code.
19. Project Disclosure Requirements
Before staking/investment is enabled, the user must be shown sufficient information to understand what they are entering.
At minimum:
Project Identity
Project name
Project code
Project type
Business stage
Owner/entity information as applicable
Verification status
Business Purpose
What the project does
Problem it addresses
Products/services
Operating location(s), where relevant
Funding Purpose
Amount requested
Why capital is required
Detailed use of funds
Funding target
Funding period
Economic Information
Current operating position
Historical information where applicable
Forecasts/assumptions where applicable
Capital deployment plan
Staking Terms
Duration
Reward
Minimum/maximum
Capital maturity
Reward withdrawal
Early withdrawal
Fees/penalties, if any
Risk
Key project-specific risks
Liquidity risk
Business execution risk
Operational risk
Other material disclosed risks
Status
Approved/Active status
Liquidity status
Term version
Last material update
20. Prohibited Project Behavior
Projects operating under ALBUKHR must not:
Present guaranteed returns where not legally permitted or contractually supportable
Hide material project risks
Misrepresent business performance
Fabricate revenue, customers, assets or operating history
Use new participant funds to disguise obligations in a manner prohibited by applicable law
Operate a recruitment-driven return scheme
Change existing user terms without an applicable contractual mechanism
Misuse user funds
Withdraw restricted liquidity
Create false liquidity
Manipulate project metrics
Circumvent ALBUKHR controls
Misrepresent approval as a guarantee of profitability or success
Any prohibited behavior should be grounds for restriction, suspension, investigation or other action under the applicable ALBUKHR rules.
21. Project Status and Market Controls
Project status must be separate from mere visibility.
At minimum:
DRAFT / PENDING → APPROVED → READINESS → ACTIVE
Operational controls may additionally support:
RESTRICTED
PAUSED
SUSPENDED
CLOSED
Important distinction
APPROVED means the project has passed the applicable approval stage.
ACTIVE means the project has passed the applicable readiness controls and is eligible for the supported user activity.
Approval must not automatically imply investment eligibility.
22. Emergency Controls
ALBUKHR should be able to pause new activity when material risk conditions arise.
Potential triggers include:
Liquidity threshold breach
Reconciliation failure
Security incident
Material fraud indicator
Regulatory/legal issue
Significant disclosure inconsistency
Unauthorized treasury activity
A pause should normally prevent new staking/investment activity while preserving existing accounting records and user entitlements subject to the applicable terms and legal requirements.
23. Project-Type Relationship
The common market framework applies to all project types, but business and governance controls remain distinct.
Core
ALBUKHR-controlled foundational projects.
Core projects use ALBUKHR treasury, liquidity and activation controls appropriate to Core governance.
Internal / Contributor
Projects originating from eligible ALBUKHR Contributors.
Internal projects require contributor identity/entitlement controls, contributor agreements and the relevant internal project review process.
External
Third-party/user-owned projects.
External projects require the applicable ownership verification, due diligence, risk, disclosure and investor-protection controls. Where ALBUKHR takes custody or otherwise handles investor funds for a third-party project, the required escrow/custody structure must be determined before public activation.
The platform should not collapse these three project types into one generic lifecycle or one generic activation function.
24. Market Integrity and Investor Protection
The project market should provide users with transparent, comparable information without implying that ALBUKHR guarantees project performance.
The system should preserve:
Immutable investment/staking records
Versioned terms
Transaction history
Treasury history
Liquidity metrics
Project disclosures
Audit events
Status changes
Administrative actions
Material changes should produce traceable audit records.
25. Data Model Direction
The following entities are proposed for the full implementation. They are design targets, not an instruction to create all tables immediately.
projects
Common project registry.
project_funding_profiles
Stores funding purpose, business stage and funding target.
project_capital_plans
Stores itemized use-of-funds and deployment planning.
project_economic_profiles
Stores business/economic assumptions and relevant historical/operating data.
project_liquidity_profiles
Stores required liquidity, reserve logic and coverage information.
project_risk_profiles
Stores risk dimensions, methodology version and assessment results.
project_disclosures
Stores the user-facing material disclosure package.
project_staking_terms
Stores project-specific staking contracts/terms.
project_staking_term_versions
Stores immutable historical versions where version separation is implemented.
project_treasury
Stores treasury configuration and treasury state.
Existing staking/transaction/withdrawal tables
Continue to act as transactional records and must not be rewritten merely to adopt this framework.
26. Network Isolation
All persistent project-market data must remain network-aware.
A Mainnet project must not use Testnet financial data, and a Testnet project must not use Mainnet financial data.
Where applicable:
network = mainnet | testnet
The frontend, API and database functions must all enforce the same network boundary.
Testnet may mirror eligible project registry metadata for testing, but Testnet must not mirror Mainnet user financial positions, staking balances, rewards or ledger obligations.
27. Existing Staking Terms
The currently configured project_staking_terms records are treated as existing production configuration/prototype data pending contract alignment.
They must not be globally interpreted as ALBUKHR-mandated reward rates.
Before modifying existing terms, engineering must audit every database/API/frontend dependency on:
project_staking_terms.project_code
project code resolution
duration
reward calculation
min/max stake
capital withdrawal
reward withdrawal
investment eligibility
No term migration should be performed until the canonical project identity used by staking is confirmed.
28. Implementation Order
The intended implementation sequence is:
Phase 1 — Framework
Capital & Funding Model
Project Risk Framework
Project Disclosure Framework
Liquidity Framework
Staking Contract Framework
Phase 2 — Contract Alignment
Confirm project identity/code model
Resolve project code vs staking-term dependencies
Version existing terms without breaking existing positions
Phase 3 — Data Layer
Add only the required schema changes
Add migrations
Add RLS/security controls
Add server-authoritative RPCs
Phase 4 — Project Readiness
Funding profile
Capital plan
Liquidity readiness
Risk readiness
Terms readiness
Disclosure readiness
Phase 5 — Owner/Admin Interfaces
Project owner funding/capital configuration where applicable
Treasury controls
Liquidity controls
Terms configuration
Risk/disclosure review
Activation controls
Phase 6 — User Experience
Project disclosure page
Staking term display
Risk information
Liquidity status
Capital/reward withdrawal UX
No production project should be made ACTIVE merely because the UI has an activation button. Activation must remain server-authoritative.
29. Regulatory and Platform Boundary
This document is an ALBUKHR product/technical design document. It is not legal advice and does not itself establish regulatory authorization.
Because the ALBUKHR model involves Pi, public-facing project opportunities, staking/investment-like participation and potentially third-party fundraising, the final production structure must undergo appropriate Nigerian legal/regulatory review.
Nigeria's SEC currently publishes rules and registration information for crowdfunding intermediaries and digital-asset/FinTech activities, and the SEC has specifically warned the public about unregistered online investment schemes and unrealistic or guaranteed-return promises. The applicable classification of any ALBUKHR activity must be determined with qualified Nigerian counsel and, where necessary, direct regulatory engagement.
Pi Network states that developers using Pi developer tools are subject to the Pi Network Developer Terms of Use. The ALBUKHR implementation must therefore remain within the applicable Pi platform/developer requirements in addition to local law.
Reference sources:
Pi Network Developer Platform: https://minepi.com/developers/
Nigeria SEC — Rules and Regulations / FinTech: https://sec.gov.ng/our-mandate/regulation/rules-and-regulations/sec-rules-for-fintechs/
Nigeria SEC — Crowdfunding Intermediary Registration Requirements: https://sec.gov.ng/about/resources/checklists/individual-registration-requirements-for-each-cmo/crowdfunding-intermediary-registration-requirements/
Nigeria SEC — Public Notice on Unregistered Online Investment Schemes (May 2026): https://home.sec.gov.ng/for-investors/keep-track-of-circulars/public-notice-unregistered-online-investment-schemes/
30. Design Decisions Locked by This Version
This version establishes the following decisions:
ALBUKHR does not prescribe one universal reward rate for every project.
Each project must have an explicit funding purpose.
Business stage is separate from funding purpose.
New-business funding and existing-business expansion must be assessed differently.
Capital must have a documented use-of-funds plan.
Liquidity readiness is required before new staking/investment activity.
Project-owned liquidity is separate from user-committed/restricted balances.
User staking terms are immutable for existing positions.
New terms are versioned rather than silently rewriting old terms.
Risk and disclosure are first-class project-market requirements.
Approval and investment activation remain separate controls.
Core, Internal and External projects retain distinct governance lifecycles.
Network isolation is mandatory.
Existing financial/staking records must not be broken merely to introduce the framework.
No current reward-term migration is authorized by this document alone.
31. Next Required Documents
This document is the Capital & Funding layer. The following controlled documents should be created next:
ALBUKHR Project Risk Framework v1.0
ALBUKHR Project Disclosure Standard v1.0
ALBUKHR Liquidity & Treasury Framework v1.0
ALBUKHR Staking Contract & Withdrawal Framework v1.0
ALBUKHR Project Market Activation Standard v1.0
These documents should be treated as a coordinated framework. Database and UI implementation should follow the approved versions rather than define policy implicitly in frontend code.
