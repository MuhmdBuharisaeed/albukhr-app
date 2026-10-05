ALBUKHR Internal Project Funding & Liquidity Policy
Document: Internal Project Funding & Liquidity Policy
Version: 1.0 Draft
Network: Mainnet
Scope: Contributor-owned Internal Projects
Status: Controlled Draft — not yet an active liquidity-calculation policy
1. Purpose
This policy establishes the governance framework for determining the capital requirements and system-controlled liquidity requirements of ALBUKHR Contributor Internal Projects.
The policy separates:
Capital Requirement — the business/project funding need identified from the approved funding plan and its itemized cost lines.
Required Liquidity — the amount ALBUKHR authorizes as the project's Mainnet liquidity requirement after system assessment and governance approval.
Verified Liquidity — the amount actually settled and verified by the ALBUKHR Internal Treasury process.
These values must never be treated as interchangeable.
2. Core Principles
Contributor declarations are inputs, not proof of funds.
Itemized funding requirements are the primary evidence for capital planning.
The system recalculates the authoritative incremental capital requirement from submitted cost lines and reserve inputs.
Existing assets may reduce the incremental business requirement conceptually, but an existing asset is not automatically verified liquidity.
Contributor-declared existing liquidity remains declared context until an authoritative evidence layer exists.
Contributor does not choose or approve the final required liquidity amount.
The liquidity model is versioned and tied to network, project context and funding mode.
Admin liquidity approval must match the system recommendation; arbitrary overrides are not permitted.
Treasury configuration must match the approved liquidity assessment.
Liquidity settlement must use the server-computed remaining gap.
Internal investment remains gated until all required lifecycle, contract, liquidity and runtime conditions are satisfied.
Mainnet data is isolated from Testnet data.
3. Funding Modes
Every Internal Project funding plan must identify one of:
startup — initial establishment of a new operation.
expansion — incremental funding for an already operating or established project.
working_capital — funding required to operate an existing business cycle.
replacement — replacement, repair or renewal of productive assets or critical equipment.
mixed — a documented combination of the above.
The selected mode must describe the actual economic purpose of the funding request.
4. Business Stage
The Contributor must describe the project's current business stage, for example:
draft / pre-launch
startup
operating
expansion
established / mature
For an operating project, the funding plan should describe the incremental requirement rather than rebuilding the project from zero.
5. Funding Plan Inputs
5.1 Business Stage
State where the project is now.
5.2 Funding Purpose
Explain what the funding is for in business terms.
5.3 Funding Mode
Choose the mode that best represents the request.
5.4 Existing Asset Base
Provide the estimated value of productive assets that already exist in the project and are relevant to the funding request. This is contextual business information and does not become verified liquidity automatically.
5.5 Declared Existing Liquidity
State the amount of Pi the Contributor believes is already available for the project. This is a declaration only and is not verified liquidity.
5.6 Declared Incremental Capital
Provide the Contributor's own reference estimate of the additional capital requirement. This is not authoritative. The system recalculates the requirement from the submitted itemized cost lines and reserve inputs.
5.7 Funding Window
Provide the expected start and end dates for deployment.
5.8 Operating Cycle
Provide the normal operating cycle in days when applicable.
5.9 Expected Capital Cycle
Provide the expected capital recovery/redeployment cycle in days when applicable.
5.10 Required Reserve
Identify the working reserve genuinely needed for continuity.
5.11 Contingency Reserve
Identify the contingency amount justified by documented operational risk.
6. Itemized Funding Requirements
At least one itemized funding line is required. Each line should contain enough information for an independent reviewer to understand:
category
description
quantity
unit
unit cost
total cost
deployment stage
notes where useful
Example:
Category
Description
Qty
Unit
Unit Cost
Total
Equipment
Production equipment
1
set
X Pi
X Pi
Packaging
Bottles / packaging materials
X
units
X Pi
X Pi
Distribution
Distribution expansion
X
cycle
X Pi
X Pi
A single unexplained lump-sum amount should not be used where the requirement can be reasonably itemized.
7. Capital Requirement Assessment
The authoritative incremental capital requirement is determined by the system from the submitted itemized cost totals and reserve inputs, together with the project's approved funding context. Contributor-entered declared capital remains a reference input.
8. Liquidity Assessment
Required liquidity is determined by the controlled ALBUKHR liquidity model applicable to the project's:
network
funding purpose
business stage
funding mode
validated funding requirement
published/approved internal contract or staking terms
relevant reserve and obligation inputs
The active model version must be identifiable and auditable.
If no active matching liquidity policy/model is configured, the assessment must remain BLOCKED rather than inventing a liquidity amount.
9. Administrative Approval
Administrative review is separated into two decisions:
Funding Assessment
Authorized reviewers may approve or reject the validated capital requirement within the system's permitted bounds.
Liquidity Approval
Authorized finance/internal administration may approve liquidity only when the assessment is ready for administration and the approved amount exactly matches the system recommendation.
The system does not permit arbitrary liquidity overrides.
10. Treasury Configuration
Treasury configuration must reference the approved Internal Project, approved liquidity assessment, authoritative Mainnet treasury wallet, and exact approved required liquidity.
11. Liquidity Settlement
A Contributor liquidity settlement is always based on the server-computed remaining gap:
remaining gap = required liquidity − verified liquidity
with a floor of zero.
The payment amount must equal the current server-computed remaining gap exactly.
12. Verified Liquidity
Verified liquidity is established only by the controlled settlement process and authoritative transaction records. A declared balance, screenshot, spreadsheet value, or Contributor statement does not become verified liquidity by itself.
13. Lifecycle Gate
Funding assessment does not itself activate investment. Internal Project investment requires all applicable conditions to be satisfied, including project status, Contributor authorization, approved funding assessment where required, approved liquidity, treasury configuration, published/approved internal contract terms, activation, and runtime readiness.
14. Auditability
Funding plans, assessment versions, approval decisions, liquidity policy versions, treasury configuration and settlement events must remain auditable. Historical decisions should not be silently overwritten.
15. Mainnet/Testnet Isolation
This policy applies to Mainnet Internal Projects. Mainnet records must not read from or write to Testnet records.
16. Controlled Status
This document is a controlled draft. It defines governance and data semantics but does not activate a numeric liquidity policy by itself. The operational liquidity model must only be activated after ALBUKHR-approved formula parameters have been reviewed and recorded as a versioned policy.
