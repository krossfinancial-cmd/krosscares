# ZIP Territory SaaS Planning Pack (v1)

Date: 2026-03-06
Owner: Jeanpierre-Louis

## 1) Locked Decisions

1. Launch vertical: `Realtors` only.
2. Exclusivity model: `1 active owner per ZIP per vertical`.
3. Pricing model: annual tiered pricing is enabled.
4. Guarantee model: enabled.
5. Legal docs: must be created before launch.
6. ZIP data strategy: use filtered ZIP inventory (exclude PO Box-only, military, unique).
7. Payments: `Stripe` (connected to Bluevine).
8. Onboarding: required info + headshot + company logo.
9. Activation flow: `Paid -> Signed -> Onboarding Complete -> Active`.
10. MVP acceptance criteria: required.
11. KPI tracking: required.
12. Pilot plan: required.

## 2) Product Scope (MVP)

1. Public pages:
- Landing page
- ZIP availability search
- ZIP marketplace listing
- Checkout handoff page
- Waitlist page
2. Client pages:
- Contract status
- Onboarding form
- Dashboard (territories, routing, billing, renewal)
3. Admin pages:
- Admin dashboard
- ZIP inventory manager
- Client management
- Renewal queue
4. Automations:
- Stripe webhook ingestion
- Contract send/sign tracking
- Onboarding completion tracking
- Territory activation
- Renewal reminders and dunning

## 3) Pricing + Guarantee (Default v1)

### 3.1 Tier Pricing

1. `Standard`: $500/year
2. `High Demand`: $1,000/year
3. `Premium`: $1,500/year

### 3.2 Guarantee Model (Recommended)

1. Exclusivity guarantee:
- While active and paid, no second realtor can own that ZIP.
2. Lead validity guarantee:
- Invalid lead replacement within 7 business days.
- Invalid means duplicate, wrong ZIP, unreachable after 3 attempts, or non-consenting contact.
3. Delivery guarantee:
- If annual guaranteed volume is missed, extend term or issue credit.

### 3.3 Annual Guaranteed Lead Volume (Starting Assumption)

1. `Standard`: 6 qualified leads/year
2. `High Demand`: 12 qualified leads/year
3. `Premium`: 24 qualified leads/year

Note: finalize these values after pilot data from the first 60 days.

## 4) ZIP Data Requirements

### 4.1 Inclusion Rules

1. Residential and mixed-use ZIPs eligible for consumer lead routing.
2. ZIP must map to valid state/city and have active mail delivery use.

### 4.2 Exclusion Rules

1. PO Box-only ZIPs.
2. Military ZIPs (APO/FPO and base-only handling ZIPs).
3. Unique organization-only ZIPs (single large entity).

### 4.3 Required ZIP Fields

1. `zip_code`
2. `state`
3. `city`
4. `county`
5. `status` (available/reserved/sold/blocked)
6. `tier`
7. `annual_price`
8. `assigned_client_id` (nullable)
9. `renewal_date` (nullable)
10. `created_at`, `updated_at`

### 4.4 Update Cadence

1. Full inventory refresh quarterly.
2. Availability status is real-time.
3. Data audit monthly for invalid ZIP records.

## 5) Onboarding Requirements (Exact v1 Spec)

### 5.1 Required Client Fields

1. Legal first name
2. Legal last name
3. Company/brokerage name
4. Business email
5. Business phone
6. License number (realtor)
7. Service area city/state
8. Purchased ZIP code(s) (read-only from order)
9. Lead routing email
10. Lead routing phone (SMS-capable)
11. Preferred contact method (call/text/email)

### 5.2 Required Uploads

1. Headshot:
- `jpg` or `png`
- Minimum 800x800
- Max 5 MB
2. Company logo:
- `png` or `svg` preferred (`jpg` allowed)
- Minimum 500 px on longest side
- Max 5 MB

### 5.3 Optional Fields

1. Website URL
2. Calendar booking link
3. Team contact email
4. Notes for lead handoff

### 5.4 Activation Checklist (Must All Be True)

1. Payment status is `paid`.
2. Contract status is `signed`.
3. Onboarding form status is `completed`.
4. Required uploads are present and valid.
5. Lead route is configured and test notification passes.

## 6) Legal Docs To Build

Important: this is a product/legal checklist, not legal advice.

1. Terms of Service
- User obligations
- Platform limitations
- Liability cap
- Dispute venue
2. Privacy Policy
- Data collected
- Use and sharing
- Retention and deletion
- Consumer rights process
3. Territory License Agreement (core contract)
- Exclusivity definition
- Territory term (12 months)
- Renewal and cancellation
- Breach and termination rights
4. Lead Delivery and Guarantee Addendum
- Lead qualification criteria
- Replacement rules
- Guarantee/credit mechanics
5. Billing and Auto-Renew Authorization
- Stripe recurring charge consent
- Failed payment retry behavior
- Grace period and release policy
6. Communications Consent Policy
- Email/SMS consent standards
- TCPA/CAN-SPAM operating rules
7. Media Usage Consent
- Right to display headshot/logo on landing/profile assets

## 7) Automation Workflow (System of Record = DB)

1. User selects ZIP.
2. System places ZIP in `reserved` for 30 minutes.
3. Stripe checkout session created.
4. On `checkout.session.completed`:
- Upsert client
- Create payment record
- Keep ZIP reserved under buyer lock
5. Send agreement for signature.
6. On signature event:
- Save signed document URL
- Update contract status to `signed`
7. Send onboarding form link.
8. On onboarding submit:
- Validate required fields/files
- Save assets
9. Activation transaction:
- Assert payment `paid` + contract `signed` + onboarding `completed`
- Set ZIP status `sold/active`
- Create lead route
- Send welcome + activation confirmation
10. Renewal automation:
- Reminder schedule at 60/30/7 days pre-renewal
- Failed payment retries via Stripe dunning
- If unpaid after grace period: deactivate route, release ZIP, notify waitlist

## 8) MVP Acceptance Criteria

1. ZIP lookup returns correct status in under 1 second for indexed lookup.
2. Double-sale prevention works under concurrent checkout attempts.
3. A paid order cannot activate without signed contract and complete onboarding.
4. Headshot/logo uploads enforce format and size constraints.
5. Admin can manually release or reassign ZIP with audit log.
6. Renewal reminders send automatically and are logged.
7. Waitlist notification triggers when ZIP returns to `available`.
8. Client dashboard shows live territory status and renewal date.
9. All critical state changes are audit logged with timestamp and actor.

## 9) KPI Definitions and Targets

1. Lookup-to-checkout conversion:
- Target: 3% to 8%
2. Checkout-to-activation conversion:
- Target: 85%+
3. Time to activation (payment to active):
- Target: under 24 hours
4. Renewal rate:
- Target: 80%+
5. Churn:
- Target: under 20% annual
6. Invalid lead rate:
- Target: under 10%
7. Revenue:
- Pilot target: first 10 clients and first 20 to 50 ZIP sales

## 10) 30/60/90 Pilot Plan

### 0-30 Days

1. Finalize legal drafts and approval path.
2. Build MVP core flow.
3. Load NC ZIP inventory and tiering.
4. Launch with limited ZIP set (20 to 50 ZIPs).

### 31-60 Days

1. Onboard first 10 paying realtor clients.
2. Track conversion and activation friction.
3. Tune guarantee thresholds and pricing by tier.
4. Add waitlist and renewal automation hardening.

### 61-90 Days

1. Expand NC ZIP inventory coverage.
2. Publish case studies and ROI proof.
3. Improve dashboard analytics.
4. Prepare expansion plan to next state.

## 11) Immediate Build Backlog (Execution Order)

1. Database schema + migrations.
2. ZIP inventory import + filters (exclude PO Box/military/unique).
3. Public ZIP lookup + marketplace.
4. Stripe checkout + webhook processing.
5. Contract send/sign integration.
6. Onboarding form + file uploads.
7. Activation gate + lead route creation.
8. Client dashboard.
9. Admin dashboard + ZIP manager.
10. Renewal jobs + dunning + waitlist release.

