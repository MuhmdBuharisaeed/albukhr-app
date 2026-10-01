ALBUKHR Project Risk Framework
Project Market Framework — Version 1.0
Document ID: ALB-PMF-RSK-001
Version: 1.0
Status: Controlled Design Draft
Owner: ALBUKHR Investment Limited
Applies to: Core, Internal/Contributor and External Projects
Network scope: Mainnet and Testnet, with strict network isolation
1. Purpose
The ALBUKHR Project Risk Framework defines how project-specific risks are identified, evidenced, disclosed, monitored and used as market controls before and after staking/investment activation.
The framework is designed to protect users without making ALBUKHR the operator of each underlying business.
ALBUKHR should not decide whether a business is commercially successful. Instead, ALBUKHR should determine whether the project has supplied the required information, controls and evidence to operate within the ALBUKHR project-market rules.
The framework therefore separates:
Business performance from risk assessment
Project claims from verified evidence
Risk disclosure from investment eligibility
Approval from activation
Project-owned resources from user-restricted resources
2. Risk Principle
A project is not safe merely because it has an approved status, and an approved project is not an ALBUKHR guarantee of profitability.
Risk assessment exists to answer four practical questions:
What could go wrong?
How significant could the effect be?
What evidence and controls exist?
What action must the platform take if the risk exceeds the permitted boundary?
The result should be understandable to both administrators and users.
3. Risk Lifecycle
The risk lifecycle is:
Identify → Collect Evidence → Assess → Mitigate → Disclose → Gate/Approve → Monitor → Reassess → Restrict/Suspend if necessary
Risk is therefore a continuous project-market control, not a one-time approval form.
4. Risk Dimensions
The framework uses multiple dimensions because project risks arise from different sources.
4.1 Business Model Risk
Questions include:
What does the project sell or provide?
Who is the target customer?
How does revenue arise?
What assumptions are required for the business to operate?
How dependent is the project on a small number of customers, suppliers or channels?
Does the proposed funding purpose match the stated business model?
4.2 Business Stage / Execution Risk
The assessment depends on whether the project is:
Concept
Setup
Pre-operation
Operating
Expansion
Mature
Typical concerns for new projects:
Construction delay
Equipment procurement
Licensing/setup dependencies
Failure to reach operational readiness
Time-to-revenue uncertainty
Typical concerns for existing businesses:
Expansion execution
Capacity utilization
Cost escalation
New-site execution
Demand mismatch
4.3 Financial / Economic Risk
Questions include:
What is the capital requirement?
How will the capital be used?
What is the operating cost structure?
When is revenue expected to arise?
What assumptions support the forecast?
What existing obligations materially affect the project?
Can the proposed capital cycle reasonably support the disclosed obligations?
Historical values, current values and forecasts must remain distinguishable.
4.4 Liquidity Risk
Liquidity risk concerns the project's ability to meet eligible user obligations under the applicable terms.
The assessment should consider:
Required reserve
Eligible available liquidity
Upcoming capital maturities
Reward obligations
Withdrawal rules
Maturity concentration
Funding cycle
Liquidity coverage
A project with inadequate eligible liquidity must not open or continue unrestricted new staking under rules that require liquidity readiness.
4.5 Operational Risk
Potential sources include:
Production dependency
Supplier dependency
Equipment failure
Logistics
Staffing
Technology
Physical facilities
Data/security controls
The project should identify the controls used to reduce material operational risks.
4.6 Governance and Ownership Risk
Questions include:
Who owns or controls the project?
Who is authorized to manage project funds?
Are relevant identities verified?
Are responsibilities separated where appropriate?
Are conflicts of interest disclosed?
Is the stated owner consistent with project registration records?
Core, Internal and External projects have different governance requirements and must be assessed under the appropriate project-type policy.
4.7 Fraud, Abuse and Market-Integrity Risk
The platform should detect and control patterns such as:
False identity or ownership information
Duplicate or linked project manipulation
Fabricated revenue or customer claims
False liquidity representations
Circular funding patterns
Artificial activity designed to mislead users
Misleading or guaranteed-return claims
Recruitment-driven return structures
Unauthorized movement of restricted funds
Attempts to bypass ALBUKHR controls
Fraud indicators should trigger investigation or control actions; they must not automatically be treated as proof of wrongdoing without evidence.
5. Evidence Hierarchy
Risk assessment should distinguish evidence quality.
Level 1 — Verified / System Evidence
Examples:
On-platform transaction records
Verified treasury records
Verified project registration data
Server-side system state
Approved identity/ownership records where available
Level 2 — Documentary Evidence
Examples:
Business registration documents
Invoices
Equipment quotations
Lease or ownership documents
Agreements
Financial records
Licenses and permits where applicable
Level 3 — Project Declaration
Information supplied by the project owner that has not yet been independently verified.
Level 4 — Forecast / Assumption
Forward-looking figures such as projected revenue, production, customers or operating margin.
Forecasts must not be represented as verified historical performance.
6. Risk Assessment States
A risk dimension should have a state such as:
NOT_ASSESSED
ASSESSED
MITIGATION_REQUIRED
RESTRICTED
ESCALATED
The overall project readiness decision must consider both risk assessments and hard eligibility gates.
7. Hard Risk Gates
Some conditions are not merely scored. They are direct blockers.
Examples include:
Project identity cannot be established
Owner/authority requirement is incomplete
Required disclosure is missing
Funding purpose is materially unclear
Required liquidity controls are not satisfied
Required treasury controls are not satisfied
Investment/staking terms are incomplete
Existing user terms would be changed unlawfully or silently
Material fraud/security issue is unresolved
Project is in a prohibited or unsupported operating state
Network isolation requirements fail
A hard gate should produce a clear machine-readable reason and a human-readable explanation.
8. Risk Bands
Where the user interface needs a simplified risk state, the framework may use:
LOW
MODERATE
HIGH
CRITICAL
These labels must be backed by documented methodology and should never be presented as a guarantee of outcome.
The exact thresholds are to be defined by the approved risk-engine implementation and periodically reviewed.
A risk band should not replace the underlying risk dimensions or the project's detailed risk disclosure.
9. Risk Factors That Must Be Project-Specific
The following should not use one universal threshold without considering project context:
Capital requirement
Funding cycle
Liquidity reserve
Duration
Reward capacity
Revenue assumptions
Operating history
Expansion scale
Asset concentration
Customer concentration
For example, a 100,000 Pi construction project and a 100,000 Pi expansion project may have materially different execution and financial risk characteristics.
10. Risk and Funding Purpose
Risk assessment must use the funding model defined in ALBUKHR Capital & Funding Model v1.0.
BUILD
Primary emphasis:
Setup/execution
Construction
Procurement
Time-to-operation
Revenue-start uncertainty
GROW
Primary emphasis:
Expansion execution
Capacity utilization
Demand
Historical performance
Expansion economics
OPERATE
Primary emphasis:
Working-capital cycle
Inventory turnover
Receivable/payable cycle
Short-term liquidity
ASSET
Primary emphasis:
Asset identity
Productive purpose
Acquisition cost
Maintenance
Dependency on the asset
BRANCH
Primary emphasis:
Location viability
Setup cost
Operating ramp-up
Distribution economics
PRODUCT
Primary emphasis:
Development risk
Product demand
Production requirements
Launch assumptions
11. Reward Capacity Risk
Reward capacity is not determined by a universal ALBUKHR reward table.
The proposed project reward should be reviewed in relation to:
Capital cycle
Business stage
Cash-flow model
Funding purpose
Liquidity reserve
Reward reserve
Staking duration
Funding target
Existing project obligations
The project must disclose the basis for its proposed reward terms.
The platform should flag a term where its required obligations materially exceed the project resources or declared economic basis under the approved model.
A warning or restriction is not a statement that the business will fail. It means the project does not currently satisfy the defined evidence/control boundary.
12. Liquidity Risk Controls
The project liquidity module should calculate, subject to the finalized Liquidity Framework:
Total treasury balance
Restricted user capital
Required liquidity reserve
Reward reserve
Eligible available liquidity
Upcoming eligible obligations
Liquidity coverage ratio
Owner-withdrawable liquidity
The system must prevent restricted balances from being counted as freely withdrawable owner liquidity.
13. Risk-Based Staking Controls
Risk can affect market access through defined controls.
Possible controls include:
OPEN
New staking is permitted subject to normal project/term limits.
LIMITED
New staking may be limited by amount, duration, funding target or other approved control.
PAUSED
New staking is disabled pending review or remediation.
SUSPENDED
Project activity is suspended pending administrative, security, legal or compliance action.
These states must be server-authoritative.
14. Project-Specific Risk Disclosure
Every active project must publish its material risks in clear language.
At minimum the disclosure should describe:
What the business does
Why the project needs capital
Main execution risks
Main financial/economic risks
Liquidity risks
Operational risks
Relevant ownership/governance risks
Relevant regulatory/legal dependencies
What happens if the business does not meet its assumptions
The disclosure must not imply that ALBUKHR has guaranteed project performance merely because the project has been approved or activated.
15. Scenario Analysis
Where a project has material forecast exposure, the risk engine should support scenario analysis.
At minimum:
Base Case
Project's stated operating assumptions.
Downside Case
One or more material assumptions deteriorate.
Stress Case
A severe but plausible disruption affects liquidity, revenue, operations or timing.
The scenarios are tools for risk management and disclosure. They are not predictions of actual project performance.
16. New Project vs Existing Business Evidence
New / Build Project
Because historical operating data may not exist, emphasis should be placed on:
Feasibility assumptions
Capital plan
Supplier/equipment evidence
Facility readiness
Deployment milestones
Market assumptions
Liquidity plan
Contingency plan
Existing / Growth Project
Where available, emphasis should include:
Operating history
Actual production
Actual sales/revenue evidence
Existing capacity
Existing customer/market evidence
Existing assets
Existing obligations
Expansion plan
Expected incremental economics
This distinction is mandatory so that absence of historical data is not mistaken for either proof of safety or proof of failure.
17. Internal / Contributor Risk
Contributor Internal Projects require additional controls because the project originates through an ALBUKHR Contributor relationship.
The assessment should include:
Contributor identity/entitlement
Contributor agreement status
Project ownership/authority
Business/project verification
Required disclosures
Funding purpose
Liquidity
Terms
Fraud/abuse controls
Contributor status must not automatically reduce the project's business or liquidity risk.
18. Core Project Risk
Core projects use ALBUKHR-controlled governance and treasury mechanisms.
Core readiness should include, at minimum:
Approved Core project
Core project identity
Treasury configuration
Liquidity readiness
Exact project staking-term readiness
Capital/deployment model
Required disclosures
Risk assessment
Activation authorization
Core activation must remain separate from approval.
19. External Project Risk
External projects require the strongest ownership/third-party controls in the platform.
The assessment should address:
Legal/ownership verification
Business registration where applicable
Due diligence
Project economics
Risk disclosure
Escrow/custody architecture where required
Investor-fund segregation
Reporting and reconciliation
Related-party/conflict considerations
No External project should be publicly activated under an unresolved funding/custody structure where such structure is required by applicable rules or law.
20. Ongoing Monitoring
Risk does not end at activation.
The platform should monitor, where data is available:
Liquidity coverage
Funding progress
Staking concentration
Maturity concentration
Withdrawal requests
Reward obligations
Treasury movement
Material disclosure changes
Status changes
Reconciliation anomalies
Fraud/security indicators
Monitoring frequency should depend on project risk characteristics and the final ALBUKHR operational policy.
21. Risk Events
A material risk event should create a durable record containing:
Project ID
Network
Event type
Time detected
Detection source
Severity/state
Evidence reference
Action taken
Responsible authority
Resolution status
Resolution date
Examples:
Liquidity threshold breach
Unauthorized treasury attempt
Material disclosure discrepancy
Security incident
Fraud indicator
Reconciliation failure
Material business interruption
Regulatory/legal event
22. User Protection Rules
Risk controls should prioritize preservation of user records and contract integrity.
A project restriction must not silently:
Delete a user's staking record
Change a user's reward rate
Extend a user's duration
Reduce a user's disclosed contractual entitlement
Rewrite historical transactions
Any legally/contractually required change must follow an explicit, audited process and applicable terms.
23. Risk Governance
Risk decisions should be separated by authority where practical.
The system should support distinct responsibilities for:
Project owner/operator
Project reviewer
Finance/treasury reviewer
Risk/compliance reviewer
Activation authority
Emergency/suspension authority
A frontend role label must never be the only source of authorization. Sensitive risk and project-state transitions must be enforced server-side.
24. Data Model Direction
The following fields/entities are design targets and should not be implemented until the schema is audited against the existing ALBUKHR database.
project_risk_profiles
project_id
network
methodology_version
assessment_state
risk_band
assessment_date
next_review_date
project_risk_factors
project_id
network
dimension
factor_code
assessment_state
evidence_level
evidence_reference
assessment_notes
mitigation_status
project_risk_events
project_id
network
event_type
severity
detected_at
source
evidence_reference
action
resolution_status
resolved_at
project_risk_scenarios
project_id
network
scenario_type
assumptions
impact_summary
methodology_version
The exact schema must be reconciled with existing RLS, RPC, treasury, staking and audit infrastructure before migration.
25. Server-Side Enforcement
Risk controls must not depend solely on frontend JavaScript.
The server/database layer must enforce, as applicable:
Network isolation
Project status
Eligibility
Liquidity readiness
Terms readiness
Treasury restrictions
Owner withdrawal limits
Risk gate state
Role/MFA requirements for sensitive actions
The UI may explain a blocked action, but it must not be the authority that decides whether the action is permitted.
26. Existing ALBUKHR System Compatibility
Implementation must preserve the existing architecture unless a specific migration is approved.
In particular:
Do not replace Supabase Core as the source of truth.
Do not reintroduce LocalStorage for persistent project, financial or authorization state.
Preserve Mainnet/Testnet separation.
Preserve existing transaction and staking records.
Preserve existing project approval flows.
Preserve existing contributor entitlement and review flows.
Preserve existing Core approval and treasury architecture.
Add new controls through server-authoritative functions and migrations.
No unrelated security, RLS or project workflow should be changed merely to introduce the risk framework.
27. Risk Review Output
For each project, the risk workspace should be capable of showing:
Business stage
Funding purpose
Funding target
Risk dimensions
Evidence level by dimension
Open mitigations
Hard gates
Liquidity status
Risk state
Published disclosures
Current staking terms
Activation readiness
Last review
Next review
Relevant risk events
The output must explain why an action is blocked or permitted without exposing sensitive internal-only information to ordinary users.
28. Regulatory and Platform Boundary
This document is an ALBUKHR product/technical design document and is not legal advice or regulatory authorization.
The final risk methodology, disclosure language, investment/staking structure, custody model and project-market operation must be reviewed against applicable Nigerian law and regulatory requirements before public Mainnet operation.
Pi Network states that developers using Pi developer tools are subject to the applicable Pi Network Developer Terms of Use. Nigeria's SEC publishes rules and guidance covering crowdfunding, digital-asset/FinTech activities and investor protection, and in May 2026 the SEC warned the public about unregistered online investment schemes and unrealistic or guaranteed-return claims.
29. Design Decisions Locked by This Version
Risk is multidimensional; one unexplained score is insufficient.
Evidence quality must be distinguished from project declarations and forecasts.
Some risk conditions are hard blockers rather than score adjustments.
Funding purpose and business stage materially affect risk assessment.
Liquidity risk is a core project-market risk.
Reward capacity must be evaluated against project economics and liquidity rather than a universal reward table.
Risk status can affect new staking access without rewriting existing user records.
Approval does not equal investment eligibility.
Core, Internal and External projects retain distinct risk/governance requirements.
Server-side enforcement is mandatory for sensitive controls.
Network isolation is mandatory.
Existing ALBUKHR financial and contributor systems must be preserved unless a specific migration is approved.
30. Next Required Frameworks
ALBUKHR Project Disclosure Standard v1.0
ALBUKHR Liquidity & Treasury Framework v1.0
ALBUKHR Staking Contract & Withdrawal Framework v1.0
ALBUKHR Project Market Activation Standard v1.0
These must be reconciled as one coordinated project-market framework before production schema changes are finalized.
