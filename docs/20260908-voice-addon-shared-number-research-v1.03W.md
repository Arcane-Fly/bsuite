---
kind: record
authority: none
owner: bsuite
evidence:
  - business-suite-unified/supabase/functions/sms-inbound/index.ts
  - business-suite-unified/supabase/functions/_shared/sms-inbound.ts
  - docs/20260828-messaging-platform-design-v1.00W.md
  - scripts/audit-doc-completion.mjs
---

# Shared business number for a small client: 3CX, custom calling, or managed — research record

> **Reading order:** section 14 records the latest operator decision: an owned voice
> stack on wholesale carriage, with no Twilio. Earlier recommendations and prices
> remain dated research for provenance. They are not current procurement authority;
> unresolved provider, legal, cost, and implementation claims require fresh evidence.

**Status:** W (working) · **Version:** 1.03 · **Date:** 2026-09-08, updated 2026-09-09 12:10 AWST ·
**Author:** Claude Code (bsuite lane) · **Supersedes:** v1.01W (merged in bsuite#3215) and v1.02W (same PR)
**Trigger:** enquiry from Rahawa Abraham, Service Coordinator, Life Purpose Australia (NDIS
provider, Wembley WA), 08 Sep 2026, "Shared Business Phone & Messaging System"
**Relates to:** `20260828-messaging-platform-design-v1.00W.md` (SMS on Mobile Message);
crm7#2594 (inbound SMS dual-write to communications — closed 2026-09-08, edge deployed); bsuite#3204 (customization programme, open)

**The question:** what is the best supported, commercially sensible way to meet the client's
requirements while retaining Mobile Message, and why?

**The answer, in one paragraph.** With Mobile Message retained, the client's "one number for
calls and texts" is only achievable by the custom bSuite calling path, because Mobile Message
delivers replies to an own number nowhere we can see them and 3CX ties SMS to the trunk that
owns the number. That custom path is justified by our product roadmap, not by a three-person
client, and its per-minute economics are the worst of the options when calls are answered on
mobiles. If the client accepts a business mobile number for calls and a separate business SMS
number, the best supported and cheapest arrangement is 3CX PRO with an Australian SIP carrier
that issues 04 numbers, Mobile Message's documented 3CX connector on a dedicated number, and
her Telcoworks 1300 forwarded to the 3CX number. Its known weakness is that a 3CX chat becomes
exclusive to whoever takes it, so "everyone sees every thread" holds only until the first
reply, after which the others see who took it but not the content unless we journal chats into
CRM7. Recommendation and conditions in §9.

---

## 0. Correction log

| # | What v1.00W or the session said | What is actually established | Consequence |
|---|---|---|---|
| C1 | Listed 3CX + Mobile Message in a comparison table and proceeded to quote a custom Twilio build without assessing it | Mobile Message publishes a 3CX connector; 3CX PRO with an AU SIP carrier is a complete, configuration-only architecture (§4) | Recommendation reassessed; custom build is no longer the default |
| C2 | "Two numbers are needed because Mobile Message is SMS-only" (session, then corrected to "own number makes one number possible") | Both were half right. Mobile Message can verify an own number, but replies to it "are sent directly to your phone" and "do not appear in the Messenger"; inbound automations list only dedicated numbers (§3.1). One number is possible only where the number's carrier delivers inbound SMS to us and we adapt it | The own-number path is send-only through Mobile Message; inbound needs the carrier plus an adapter |
| C3 | Twilio AU mobile number USD 20/mo (round-2 review, and one summarised page read) | Row-by-row read of the voice pricing page: Local 3.00, Toll-free 20.00, Mobile 8.25 USD; a second lane read 8.25 on two pages. The 20 was the toll-free row | Number cost AUD 12.69, not 30.77; both kept as a sensitivity in §7 |
| C4 | Telcoworks 3.75c/min used as a mobile-forwarding rate | The 3.75c promo excludes mobile destinations; standard plans charge 10–22.5c/min to any answerpoint. Her plan is unknown | §5 uses the $20 plan (15c/min, 133 min) as an explicit assumption pending her invoice |
| C5 | "Twilio replies terminate on our sms-inbound webhook" stated as if working | `sms-inbound` is JSON-only, authenticated by a `?secret=` query parameter, keyed on `message_numbers.sender`; a Twilio form-encoded POST returns 400 (§6.1) | Any carrier-inbound path needs an adapter and evidence; none exists |
| C6 | "Softphone becomes worthwhile above ~150 min/month" | Payback computed in §7.5: 3–5 years at this client's volumes; browser softphone is desk-only in practice | Not a lever for this client |
| C7 | $450 setup, $146/month, 60 minutes, 25c overage, four weeks | Provisional assumptions; re-costed per architecture in §7 | Retail figures restated |
| C9 | v1.02W §13: "Twilio stays the first-build voice provider" | Operator standing rule 2026-09-09 11:45: no Twilio; own the capability on wholesale carriage; think long term. Rented per-minute platforms are the comparison, never the default | §14 replaces the provider layer with an owned switch on reseller/wholesale carriage; Twilio removed from the build |
| C8 | Inbound-SMS inbox gap treated as a lane risk | crm7#2594 is closed (dual-write + edge deploy 2026-09-08); bsuite#3204 remains the customization programme epic; it defines the canonical inbound contract | This record consumes that work and must not duplicate it |

## 1. Requirements and constraints

Client requirements (her words): R1 see incoming and missed calls; R2 client SMS in one shared
inbox; R3 reply from the same business number; R4 outgoing calls show the business number;
R5 see if someone already replied or called back; R6 mobiles and ideally desktop. Framing:
"one central business number… one shared number for outgoing calls and two-way SMS."

Operator constraints: Mobile Message stays; own-number verification on Mobile Message is
established; the carrier decision is how to connect the 1300 and provide shared voice; separate
own-number support from where replies arrive and how they reach the shared inbox.

## 2. Evidence table

| # | Claim | Source | Accessed | Version / plan | Confidence |
|---|---|---|---|---|---|
| E1 | Mobile Message 3CX connector requires "a 3CX Hosted licence with BYO (generic) trunks — available on Pro and Enterprise tiers"; self-hosted also works; needs a dedicated SMS number; DID routed to a Ring Group or Queue; chat appears in the 3CX Web Client in ~2 s | help.mobilemessage.com.au/integrations/mobile-message-3cx-sms-integration-guide | 2026-09-08 | current | High |
| E2 | Own mobile number as sender: "replies are sent directly to your phone", "replies do not appear in the Messenger", "conversations are not managed inside Mobile Message" | help.mobilemessage.com.au/sending-receiving-sms/choosing-a-sender-what-are-the-options ; …/two-way-sms-basics-how-replies-work | 2026-09-08 | current | High |
| E2b | Own-number SENDING through Mobile Message and crm7 is proven in production: the operator sends from his own mobile number today; replies arrive on that handset, not in crm7 or Mobile Message | Operator statement 2026-09-08 16:34 AWST | 2026-09-08 | production | High |
| E3 | Inbound automations: receiving-number picker shows "only your active dedicated numbers"; actions include Webhook (JSON) and "Forward 3CX"; retried; 25 automations/account | help.mobilemessage.com.au/sending-receiving-sms/inbound-automations | 2026-09-08 | current | High |
| E4 | Dedicated number is "an Australian mobile number assigned exclusively to your account", first free after credit purchase, must send once per six months; voice not mentioned | help.mobilemessage.com.au/sending-receiving-sms/how-to-get-your-free-dedicated-number | 2026-09-08 | current | High (SMS); voice unknown |
| E5 | Inbound webhook fields: to, sender, message, received_at, type (inbound/unsubscribe), original_message_id, original_custom_ref; retries 10× exponential from 60 s; signing X-MM-Signature HMAC-SHA256 over `{timestamp}.{raw_body}`, X-MM-Timestamp ±5 min | help.mobilemessage.com.au/api/setting-up-webhooks ; …/verifying-webhook-signatures | 2026-09-08 | current | High |
| E6 | Mobile Message pricing 1.6c first purchase, 2–4c standard; inbound free; SMS only, no voice | mobilemessage.com.au/pricing ; /api-documentation | 2026-09-08 | current | High |
| E7 | 3CX pricelist: Basic $485, PRO $635, AI $925 per year at SC8 (up to 40 users); Hosted by 3CX +$475/yr on PRO/AI | 3cx.com/ordering/pricing/pricelist/ | 2026-09-08 | v20, 2026 pricelist | Medium (pricing data embedded in page; confirm by quote) |
| E8 | 3CX Free tier withdrawn for new sign-ups Jan 2026; Enterprise renamed AI | third-party reports only | 2026-09-08 | — | Low |
| E9 | 3CX Business Chat: any queue member sees a chat until someone takes it; then "no other agent can respond or see the conversation"; taker's name shown | 3cx.com/docs/business-chat/ plus forum synthesis | 2026-09-08 | v20 | Medium-high |
| E10 | 3CX CRM integration: contact lookup by phone, contact create, call journaling with CallType/Direction/Agent/Duration after call end, chat journaling with ChatMessages after chat end; auth none/basic/API-key header/OAuth2 | 3cx.com/docs/crm-integration/ ; /docs/crm-template-xml-description/ | 2026-09-08 | v20 | High |
| E11 | 3CX generic SMS model: 3CX POSTs `{"from","to","text"}` to Provider URL with bearer API key; inbound/DLR contract undocumented by 3CX; providers write adapters | 3cx.com/community threads 119843, 126573; siptrunk/sip.us/ClearlyIP guides | 2026-09-08 | v20 | Medium (contract not first-party) |
| E12 | Simultaneous ring of a user's desktop and mobile apps is default; abandoned queue calls are logged as abandoned, per-extension logs are personal, shared view is in Call Reports | 3CX docs/community | 2026-09-08 | v20 | Medium |
| E13 | Australian Phone Company: 5 lines $8.95/mo, 2 lines $0; Mobile (614) number $7.50/mo with "3CX or Yeastar two-way SMS chat full support"; mobiles 10–12c/min, landlines 8–10c untimed, 13/1300 30c untimed; 1300 hosting $9/mo; 3CX SMB Advanced add-on $15/mo; GST exclusive | australianphone.com.au/sip-trunking | 2026-09-08 | current | Medium (single page; inbound rates and SMS delivery outside 3CX not published) |
| E14 | Twilio AU: Local USD 3.00, Toll-free 20.00, Mobile 8.25 per month; out to mobile 0.075, landline 0.0252; in to mobile number 0.05; SDK 0.004; SMS out 0.0515, in 0.0075 | twilio.com/en-us/voice/pricing/au ; /sms/pricing/au | 2026-09-08 | public list | High for rates; number price resolved per C3 |
| E15 | 1300/1800 are inbound-only in AU (never outbound CLI); only 04 numbers do voice + two-way SMS; Twilio AU mobiles support two-way SMS; regulatory bundle required | twilio.com/en-us/guidelines/au/voice ; /guidelines/au/sms ; docs/phone-numbers/regulatory/faq | 2026-09-08 | — | High |
| E16 | Telnyx: AU mobile numbers with voice and messaging exist; 3CX via Generic template ("no longer a supported carrier"); AU rates not on public pages fetched | telnyx.com/release-notes/australian-mobile-voice-and-messaging-now-available ; support.telnyx.com 3CX v20 guide | 2026-09-08 | — | Medium; prices unverified |
| E17 | Breeze Connect mobile-number hosting is voice-only; Aatrox does mobile/SMS via Twilio; Aatrox 1300 hosting $15/mo + 9c/min, port $50, activation $75; CrazyTel PAYG $0, mobile from 5c; Sipcity 04 from $10 (secondary) | provider pages per lane | 2026-09-08 | — | Medium-low |
| E18 | Telcoworks plans: $5 (22.5c/min), $10 (17.5c), $20 (133 min, 15c), $40 Platinum (400 min, 10c), $0 promo 3.75c excl. mobile; $20 setup; 12-month term; caller ID passes through by default; SIP answerpoint not documented; no SMS | telcoworks.com.au plans pages | 2026-09-08 | current | Medium (a headline elsewhere says 15c on the $5 plan; conflict retained) |
| E19 | ACMA Sender ID Register (1 Jul 2026) covers alphanumeric IDs only | acma.gov.au | 2026-09-08 | — | High |
| E20 | Estate: `sms-inbound` JSON-only, `?secret=` auth, tenant by `message_numbers.sender`, no idempotency, STOP suppression real in `email-dispatcher`; outbound dual-written to `communications` (attributed) and `message_usage`; no call table; no public lookup/journaling endpoints; PWA yes, push no | code, file:line in §6 | 2026-09-08 | development heads | High |
| E21 | crm7#2594: canonical conversation record, tenant by receiving number, full text, idempotent, inline reply, workflow events, backfill; tracked under bsuite#3204 | docs/plans/20260908-remediation/issues/crm7-2594.md | 2026-09-08 | open | High |
| E22 | crm7 Basic $29 includes the communications module; gate is the `email_integration` flag, not tier | business-suite-unified/src/lib/pricing.ts ; crm7/src/App.tsx | 2026-09-08 | development | High |
| E23 | net2phone AU listed on Mobile Message integrations, Zapier-mediated; AU plans, 04 numbers, apps not found | mobilemessage.com.au/integrations/app/net2phone | 2026-09-08 | — | Low |

## 3. What the established facts allow

### 3.1 Mobile Message's sender model, and where replies go

| Sender | Outbound via Mobile Message | Replies | Reach our systems how |
|---|---|---|---|
| Dedicated number (Mobile Message's own 04) | Yes | Messenger, email, webhook, Forward-to-3CX | Webhook to `sms-inbound` (today) or 3CX connector |
| Own verified mobile number | Yes | "sent directly to your phone", never in Mobile Message | Only via that number's carrier (SIP carrier or CPaaS inbound SMS) plus an adapter we write |
| Alphanumeric | Yes | Not supported | — |

So: one number for voice and SMS, with Mobile Message sending, means the voice carrier's 04
number is the own-number sender and the carrier's inbound SMS path feeds our inbox through an
adapter. Established support for own numbers is real; the inbound half is ours to build.

### 3.2 Why 3CX plus Mobile Message means two numbers

In 3CX, an SMS chat belongs to the trunk whose DID received or sent it, and replies go out on
that trunk. The Mobile Message connector is a generic trunk whose main number is a Mobile
Message dedicated number. A carrier 04 number for voice lives on a different trunk. There is no
3CX mechanism to send on the Mobile Message trunk while receiving on the carrier trunk for the
same conversation. Therefore 3CX with Mobile Message SMS is one business mobile number for calls
plus a Mobile Message business number for texts. One number inside 3CX is possible only if SMS
moves to the voice carrier (Australian Phone Company documents 3CX two-way SMS chat on its 04
numbers), which leaves Mobile Message for that client.

## 4. Architectures compared

| Requirement | A. 3CX PRO + AU SIP carrier + Mobile Message dedicated number | B. Custom bSuite calling + Twilio + Mobile Message own number | C. Hybrid: 3CX for calls, CRM7 for SMS | D. Managed UCaaS keeping Mobile Message |
|---|---|---|---|---|
| R1 incoming and missed calls, all three | Config: ring group/queue, apps ring together (E12). Missed = per-extension logs + abandoned list; shared view in Reports | Build: `call_log` in `/communications`; bridge dials mobiles via PSTN | As A for calls | Not established: net2phone AU details not found (E23) |
| R2 shared SMS inbox | Config, but chat becomes exclusive once taken (E9). Shared only until first reply, then via Reports or CRM journaling | CRM7 inbox after crm7#2594; needs carrier-inbound adapter (§6) | CRM7 inbox after crm7#2594, on a Mobile Message dedicated number, no adapter | — |
| R3 reply from the business number | Yes, from the Mobile Message dedicated number | Yes, from the one number | Yes, from the SMS number | — |
| R4 outbound calls show the business number | Config (extension/trunk CLI) | Build (bridge `callerId`) | As A | — |
| R5 see who replied / called back | Partial: taker's name shown; call reports | Build: attribution in inbox | Partial calls; SMS attributed in CRM7 | — |
| R6 mobile + desktop | Native iOS/Android with push, desktop app, web client | PWA, no push; mobile ringing only via PSTN bridge; desktop softphone possible | Two apps: 3CX for calls, CRM7 for SMS | — |
| One number for calls and SMS | No (§3.2) | Yes | No | — |
| Software to build | None. CRM7 journaling endpoints optional (§6.3) | Voice module, adapter, push: ~16–20 dev days plus #2594 dependency | 3CX config + optional journaling | — |
| Best-supported path | Documented end to end by 3CX, carrier and Mobile Message | Custom, against `sms-inbound` being redesigned | Documented parts, two apps | Unverified |

Verdict per option: A meets R1, R3, R4, R6 by configuration, R2 and R5 partially, and fails
"one number". B meets all six only after a build we would own, on the worst per-minute
economics for mobile answering. C is A's voice with our SMS inbox and two apps for staff.
D could not be established from public sources for Australia.

## 5. The 1300

| Arrangement | Per inbound minute | Fixed | Caller ID | Status |
|---|---|---|---|---|
| (a) Keep at Telcoworks, forward to the 3CX carrier's number | Telcoworks 10–22.5c by plan (15c on $20 plan after 133 min) + carrier inbound (APC: not published, assumed included; Twilio USD 0.05) | Telcoworks plan $5–40 | Passes through by default (E18) | Available now; cost dominated by Telcoworks per-minute at volume |
| (b) Keep at Telcoworks, SIP delivery into 3CX | — | — | — | Not documented by Telcoworks; treat as unavailable until they confirm |
| (c) Port the 1300 to the carrier | APC hosting $9/mo (inbound rate not published); Aatrox $15/mo + 9c/min, $50 port + $75 activation, lead time unverified | as stated | Native | 12-month Telcoworks term and port-out fee unknown; rollback = port back |

Do not decide (c) before her Telcoworks invoice: on the $40 Platinum plan with 400 minutes
included, porting saves little at low volume.

## 6. Estate integration

### 6.1 What exists (file:line, development heads, 2026-09-08)

| Capability | State | Evidence |
|---|---|---|
| Outbound SMS via Mobile Message | WIRED | `crm7/src/services/emailService.ts:481-524` → BSU `email-dispatcher` → `_shared/sms-provider.ts` |
| Outbound attribution in `/communications` | WIRED | `crm7/src/lib/communications.ts:112-120` writes `sender_id`; `useMailData.ts` reads `communications` |
| Inbound SMS capture | WIRED to `message_usage`, BUILT-UNWIRED to the inbox | `sms-inbound/index.ts:66` JSON only; `:30-37` `?secret=` constant-time; `:127-131` tenant by `message_numbers.sender`; `:140-143` unknown number → 200 ignored; no idempotency; crm7#2594 owns the fix |
| STOP suppression | WIRED | `email-dispatcher/index.ts:301-328`; operational numbers override `:460` |
| Twilio form-encoded webhook | DEFECTIVE by construction | `req.json()` at `:66` throws → 400; field names and auth differ |
| Thread grouping by phone number | ABSENT | `thread_id` null for SMS (`ComposeForm.tsx`) |
| Call table / call UI | ABSENT | no `call_log`, no `channel='call'` |
| Public contact lookup / journaling endpoint with API-key auth | ABSENT | only provider-specific webhooks (stripe, fairwork, xero, adobe-sign, calendar) |
| PWA | WIRED (installable, offline) | `crm7/vite.config.ts:301-340` |
| Web push | ABSENT | no VAPID/pushManager anywhere |
| Comms-only tenant | WIRED via flags | `useFeatureFlags.ts:33-78`; keep `email_integration`, `sms_integration`, `people_crud`, `contacts_crud`, `dashboard`, `settings_integrations`, `notification_settings` |

### 6.2 Coordination with crm7#2594

That issue redefines the inbound contract: full text, provider correlation, signature
verification (E5), idempotency, tenant by owned receiving number, one conversation record,
inline reply, workflow events, backfill. Anything here that touches inbound SMS is downstream of
it: a carrier-inbound adapter for option B must emit whatever #2594 makes canonical, and the
Mobile Message dedicated-number path for options A/C needs nothing from us beyond #2594 landing.

### 6.3 A 3CX-to-CRM7 integration, if wanted

3CX's template can call three endpoints we would add as BSU edge functions with a per-tenant
API key (a `telephony_integrations` table holding a hashed key and the tenant): contact lookup
by normalised phone (RLS by tenant), call journaling (new `call_log` or `communications` row
with `channel='call'`, direction, agent email → user, duration, CallType incl. Missed and
Notanswered), chat journaling (`ChatMessages` transcript written as `communications` rows or
appended to the #2594 conversation, attributed to `AgentEmail`). Timeliness: calls arrive at
call end (fine); chats arrive when the 3CX chat session ends, which can be hours or days later,
so CRM7 would hold history, not the live thread. Duplicate events: key on 3CX call id / chat id.
Unknown contacts: create-on-miss is optional in the template; safer to journal against the
number and surface "unmatched" as #2594 does. Opt-outs: unaffected, Mobile Message and
`email-dispatcher` handle STOP. Staff would work in 3CX day to day and in CRM7 for records.
Estimate 4–6 dev days, sold as an optional line.

## 7. Cost model

Assumptions, stated once: AUD ex GST; USD converted at 0.65 USD per AUD; Twilio bills per
minute rounded up; APC landlines untimed (modelled as one 4-minute call); Telcoworks $20 plan
(133 min, 15c/min after) pending her invoice; outbound 80% to mobiles; the client keeps her
three mobiles and the Telcoworks 1300 in every option; Mobile Message SMS at 3c; 3CX PRO SC8
hosted by 3CX = ($635 + $475)/12 = $92.50/mo; APC 5-line plan + 04 number + 3CX add-on
= $31.45/mo. Every cell is rate × volume with the rates in E13, E14 and E18; no hidden factors.

### 7.1 Supplier cost per month by scenario

| Scenario (in min / out min / SMS out / SMS in) | A. 3CX hosted PRO + APC + MM dedicated | A'. 3CX via APC add-on ($15) instead of 3CX-hosted PRO (if generic trunk allowed, unverified) | B. Custom, bridge to mobiles | B'. Custom, desktop softphone | Telcoworks share (all options) |
|---|---|---|---|---|---|
| Low 150 / 150 / 100 / 60 | **$163** | $71 | $100 | $67 | $23 |
| Medium 400 / 400 / 300 / 200 | **$230** | $138 | $247 | $160 | $60 |
| High 900 / 900 / 800 / 500 | **$366** | $274 | $544 | $348 | $135 |

Twilio number sensitivity (C3): +$18/mo on B if USD 20 applied. B with Twilio SMS instead of
Mobile Message: +$5 (low) to +$39 (high).

Reading: at every volume the bridge design is the most expensive shape because each call is two
PSTN legs; Telcoworks per-minute is the largest single line above ~400 inbound minutes; 3CX's
licence is a fixed $92.50 that the APC-hosted variant would cut to $15 if, and only if, that
edition accepts the Mobile Message generic trunk (E1 says PRO or above; unresolved Q3).

### 7.2 Retail and client total, option A (recommended shape)

| Line | Supplier | Our retail | Note |
|---|---|---|---|
| Setup: 3CX provisioning, APC trunk and 04 number, ring group, after-hours, voicemail, apps on 3 phones + desktop, Mobile Message dedicated number + connector, 1300 forwarding, test | ~2 days | **$950** | Config only, no software |
| Optional: training 1 hr | | $250 remote / $450 onsite | |
| Optional: CRM7 call and chat journaling (§6.3) | 4–6 days | $1,950 | Lands records in CRM7 |
| Monthly: 3CX PRO hosted + APC plan/number/add-on + support | $124 | **$165** | Or she contracts 3CX and APC directly and we bill $40/mo support |
| Calls | APC 10–12c mobile, 8–10c/call landline | 15c/min mobile, 12c/call landline | Passed through with margin |
| SMS | Mobile Message 2–4c, inbound free | 7c prepaid / 6c recurring | Design doc §6 |
| Telcoworks | hers | hers | Unchanged |
| Client total, medium scenario | | **≈ $165 + $50 calls + $21 SMS + $60 Telcoworks ≈ $295/mo** | Calls = 320 mobile min × 15c + 20 landline calls × 12c; before offsets (§8) |

### 7.3 Retail and client total, option B (custom), for comparison only

Setup cannot honestly be $450: it is a 16–20 day build plus an adapter against a contract in
flight. If roadmap-funded, retail setup $950, monthly 3 × Basic $29 + voice add-on $59 (number
+ 60 min) = $146, overage 25c/min, SMS 7c/10c. Client total at medium ≈ $146 + $185 calls
+ $21 SMS + $60 Telcoworks ≈ $412/mo, with our margin on calls ~2c/min. Worse for her and thin
for us.

### 7.4 Provisional figures reassessed

$450 setup: too low for either shape. $146/month: right order for A ($165) but wrongly
composed. 60 included minutes at 25c: replaced by carrier pass-through at 15c on A. Four weeks:
A is one to two weeks of configuration once accounts exist; B is four to six weeks and gated on
#2594.

### 7.5 Softphone payback (option B)

Saving per minute vs bridge: 10.9c out, 10.9c in. Medium scenario 800 min → $87/mo. Build:
Twilio Voice JS SDK in the PWA, 5–8 dev days ≈ $3,750–6,000 at the TAMS day rate → payback
43–69 months for one client. Browser softphones on mobile have no push and no CallKit, so they
answer only while the tab is open; desk use only. Not a lever for this client.

## 8. Subscription offsets

Only count what she names. Candidates and verdicts:

| Tool | Replaceable by CRM7 today? | Basis |
|---|---|---|
| HubSpot (forms on her site; plan unknown, may be free) | Only if she is on a paid Starter seat for contacts/forms alone; CRM7 Basic has contacts, pipeline, forms | E22; ask plan and price |
| NDIS platform (unknown) | No. Integrate after she names it; ShiftCare has an API + webhooks; research it ourselves, do not ask her to | Lane research |
| Microsoft 365 | No | Email, calendar, Bookings stay |
| Telcoworks | No, in every option; possibly port later (§5c) | |
| Forms / e-sign / booking add-ons | Item by item after she lists them | |

## 9. Recommendation

**For this client: option A, conditional on two answers.** 3CX PRO, an Australian SIP carrier
issuing an 04 number (Australian Phone Company is the cheapest verified; Telnyx is the
alternative pending rates), Mobile Message's 3CX connector on a dedicated number, the 1300 kept
at Telcoworks and forwarded. Reasons: every part is documented by its vendor; native apps with
push cover R6 properly; the carrier answers calls in the app so there is no second PSTN leg;
nothing has to be built; supplier cost is the lowest of the viable shapes at every volume.

Conditions that change it:

1. If she requires one number for calls and texts, A cannot deliver it with Mobile Message.
   Then either (i) accept the carrier's SMS on the 04 inside 3CX (one number, best supported,
   Mobile Message not used for this client — operator decision), or (ii) option B when the
   voice module exists as product, not before.
2. If "everyone sees every text" matters more than "one person owns each reply", A needs the
   CRM7 chat journaling line (§6.3) and staff must accept history-after-close, or option C.
3. If Q3 (generic trunk on the APC-hosted 3CX edition) resolves yes, A's monthly drops by
   ~$77 supplier cost.

**For the product: build calling on the roadmap, not for her.** The custom path is justified by
GTO field officers and by owning the record, not by a three-seat office. When it exists, offer
her a migration.

## 10. Unresolved questions

| # | Question | Resolves by |
|---|---|---|
| Q1 | Does Mobile Message accept a CPaaS/SIP-hosted 04 (no SIM) as an own number, and does the verification code reach us? Handset own-number sending is already proven (E2b); this is only relevant to the custom path | Account test with a hosted Twilio/APC number (10 min), only if the custom path is pursued |
| Q2 | Does 3CX Hosted PRO accept a generic (BYO) trunk today? | 3CX or partner confirmation (Mobile Message's 2026 guide says yes; older 3CX threads said no) |
| Q3 | Does the APC-hosted "3CX SMB Advanced" add-on allow a generic trunk for Mobile Message? | Provider documentation / APC support |
| Q4 | APC inbound per-minute on DIDs and 1300s; APC inbound SMS delivery outside 3CX (webhook/API) | Provider documentation or contact |
| Q5 | Telnyx AU mobile number rental and per-minute/per-segment rates | Telnyx account pricing |
| Q6 | Her Telcoworks plan, term end, port-out fee, and whether a SIP answerpoint is possible | Client invoice + Telcoworks |
| Q7 | Her HubSpot plan and price; her NDIS platform | Client input, then our research |
| Q8 | Whether 3CX chat exclusivity can be relaxed (supervisor view) in v20 | 3CX documentation / bench test on a trial key |
| Q9 | #2594's final inbound contract (fields, signature, idempotency) | Repository inspection when it lands |
| Q10 | Twilio number USD 8.25 vs 20 | Resolved by row-by-row read (C3); confirm in console when an account exists |

## 11. Acceptance test plan (option A)

1. Shared number: from each of the three 3CX apps, call a test mobile; callee sees the 04
   business number each time; call log shows the agent.
2. 1300 changeover: forward the Telcoworks 1300 to the 04; call the 1300 from an external
   mobile; all three apps ring within 3 s; original caller ID shown; answer on one, others
   stop; repeat with nobody answering → voicemail; voicemail email arrives; abandoned call
   visible in the app and in Call Reports with timestamp.
3. Ring order: switch the group to sequential; verify order and timeouts.
4. After hours: set office hours; call outside them → the configured rule fires.
5. SMS out: send from 3CX on the Mobile Message dedicated number; recipient sees that number;
   Mobile Message logs the send with the 3CX agent in the chat.
6. SMS reply: reply from the handset; chat appears in the 3CX web client within ~2 s for all
   queue members; one agent takes it; the other two see it taken by name; reply goes out on the
   same number; Mobile Message Messenger shows the thread.
7. Attribution: for each of the above, a second staff member can determine who replied or
   called back without asking (chat taker name; Call Reports).
8. Desktop + mobile: same user logged in on both; both ring; answer on desktop; mobile stops.
9. Billing: after the test week, reconcile APC and Mobile Message invoices against the call
   and chat logs; confirm per-minute and per-segment charges match §7 assumptions.
10. Rollback: point the 1300 back to a mobile; confirm within one business day.

If the CRM7 journaling line is bought: 11. each completed call and each closed chat appears in
`/communications` against the matched contact within 5 minutes of ending, with agent and
direction; a duplicate journaling POST creates no second row; an unmatched number appears as
unmatched, not against a wrong contact.

## 12. Client email and deal state (updated 2026-09-09)

The operator sent his own reply on 2026-09-08 17:33 AWST, not the draft in §12 of v1.01W. It
committed to the bSuite path with **one business number for outgoing calls and texts**, a
shared inbox, call history, mobiles and desktop, the extras list (training $250 remote / $450
onsite; contact import, after-hours routing and voicemail transcription "quoted separately"),
a slower "wholesale account" option and "around four weeks". The estimate block was sent
empty. That is an operator decision: option B in §4 is the committed architecture, and the
3CX recommendation in §9 is superseded for this client while remaining the evidence base.

The client accepted on 2026-09-09 10:04 AWST: incoming calls routed by working day (Nat
Mon/Wed/Thu, Matilda Mon/Tue/Wed/Fri, Rah as backup with oversight), after-hours recorded
message plus voicemail all can access next business day, low volume, contacts in ShiftCare,
voicemail transcription and one-hour remote training wanted, happy to wait for the wholesale
option if it saves a reasonable amount, and asked for the setup and monthly figures.

A pricing reply is drafted, unsent: setup $450 core + $150 after-hours + $95 transcription
setup + $95 ShiftCare CSV import + $250 training = $1,040; monthly $146 (3 × Basic $29 + $59
number incl. the first hour of pooled conversation minutes, support and updates); usage 25c/min
beyond, texts 7c–10c, replies free, transcription 5c/min; four weeks as a target with go-live
confirmed once the number is provisioned; wholesale not quantified to the client. ShiftCare
offers a self-serve client-list CSV under Integrations > CSV Import, so import is a load, not an
API project.

## 13. Reconciliation with the second researcher's plan (Astra, "bSuite communications integration", 8 Sep 2026, v1.00W)

Read in full on 2026-09-09 (2,656 words). Its referenced handoff files (README, implementation
plan, communications-contracts.md, launch-invariants.md, source ledger, provider RFQ, cost
guide, agent briefs, acceptance/runbook, review log) were not in the operator's Downloads; only
the .docx was. Claims checked against live state:

| Astra's claim | Checked | Result |
|---|---|---|
| "The current research PR has merged" | `gh pr view 3215` | True, merged 2026-09-08 09:49Z |
| "the CRM7 inbound-SMS issue is closed" | `gh issue view crm7#2594` | **False on GitHub: OPEN, state REOPENED.** The substance has landed: crm7#2597 (read state, provider receive time) and #2599 (workflow triggers) merged; live migrations 20260908110607, 20261125000000 backfill, 20261127000000 durable persist (also ledgered under wall-clock 20260908121749), 20261128 and 20261129 hardening are applied on tuybltdrdefjblnplpqo. Edge-function deployment and the live inbox are separate, unchecked claims |
| "nonunique provider message IDs" | migrations | Addressed: `message_usage_provider_message_id_uidx` unique (tenant_id, provider_message_id), applied |
| "per-tenant number uniqueness" | BSU migration | True: `unique (tenant_id, sender)` on message_numbers; a number could be claimed by two tenants |
| "broad tenant-scoped communication updates" | crm7 baseline | True: `tenant_update_communications` lets any authenticated tenant member update any row in the tenant |
| Supabase project in us-east-1, separate Sydney project, no migration completed | not re-checked | Consistent with the estate memory; not verified this session |
| Mobile Message 3CX integration was a material omission | agreed | Same as C1 in §0 |
| Shared 04 identity needs a proven incoming callback route; verified outbound CLI alone does not establish it | agreed | Same as §3.1 and Q1 |
| $450 / ~$145 / 60 min / four weeks not validated for the expanded programme | agreed, with a distinction | v1.01W §7.4 reached the same view for the client deal; Astra's programme adds PracticeBridge (a separate practice app on Cliniko, not a registered suite app) and totals 29–48 engineering days, CRM7 subset 20–33 days. The client deal is the lean 16–20 day build of §9 plus the P0 baseline; PracticeBridge is a separate decision |
| "Test Crazytel Hybrid first, MaxoTel next; wholesale proposals from Swoop and Symbio" | first-party docs, 2026-09-09 | **Crazytel:** hosted PBX / SIP hybrid, plans $20–$149.95 + $5 Hybrid fee with AU calls included, CrazyPhone iOS/Android app, ring groups as $1/mo add-on; API is provisioning + DID + SMS send + `GET /api/v1/cdrs`; **no call-origination or event webhook endpoint; 04 numbers not documented**; channel programme is a 10% referral, not white-label. **Maxo:** hosted PBX from $24.95–29.95/mo, virtual mobile numbers from $14.95/mo usable as outbound identity with ring groups and time switches, `calls/initiate` (rings the extension then bridges: **two legs, same shape as Twilio**), `calls/list` CDR pull, no webhooks found, inbound SMS API "planned". **Swoop and Symbio:** contact-sales, enterprise/reseller positioning, no public minimums; fit for a 3-seat vendor unverified. Verdict: Crazytel cannot be "first" because it has no call control; Maxo is the only managed candidate with call control and is not a single-leg cost saving. Neither replaces Twilio programmable voice as a drop-in today |
| Wholesale can be more expensive (minimums, fees) | agreed | Client-facing wording now does not quantify a wholesale saving |
| 44 acceptance scenarios, pilot targets (95% of call status within 10 s), emergency-call and recording gates, 1300 cutover discipline | not in this record before | Adopted as the superset of §11; recording/transcription: Astra says off initially pending storage-location and legal review, while the client has asked for transcription. Decide before the agreement: Voice Intelligence en-AU processing location must be confirmed |

**Reconciled position for the client deal.** Committed architecture: custom bSuite calling on a
Twilio AU mobile number with Mobile Message own-number sending, per the operator's email.
Twilio stays the voice provider for the first build because it is the only verified path with
programmable call control, event webhooks and a documented AU 04 number; Maxo is the managed
alternative to spike (one trial account: virtual mobile number, two extensions in a ring group,
`calls/initiate`, check CDR attribution, caller ID and the billed rate). Crazytel is not a
candidate for call control. Wholesale (Swoop, Symbio) is a P9 commercial decision, not a
dependency for this client. PracticeBridge is out of this deal's scope.

**What changes in the build order (§9).** Add P0 from Astra: pin current refs, ownership map,
writers and grants before the first edit. Add durable idempotency keys on every outbound
command and per-call session/leg identities so one answered ring-group call cannot create two
missed-call tasks. Keep the inbound-SMS work as landed by crm7#2594; the carrier-inbound
adapter emits into `sms_inbound_persist`. Recording and transcription: confirm processing
location and retention before enabling; the client has asked for transcription, so this is a
pre-agreement item, not a post-launch one.

**Open, by resolution type.** Q1 SIM-less own-number verification (account test, now critical
path). Maxo spike (trial account). Astra's handoff package location (operator). Voice
Intelligence en-AU processing location and retention (provider documentation, legal). Whether
the four-week target survives P0 (repository inspection after P0).

## 14. Owned voice stack on wholesale carriage (standing rule, 2026-09-09)

**Rule (operator, verbatim):** "i'm 100% not supporting twilo. i far prefer the option of
having our own version at wholesale costs. think general standing rules. best long term
solution." Recorded in agent memory and qig-memory
(`bsuite_ruling_20260909_no_twilio_own_voice_stack_at_wholesale`). This section supersedes the
provider layer in §9 and §13. Everything the client was promised (§12) still holds; what changes
is who owns the switch, the per-minute economics, and the lead time.

### 14.1 Architecture

| Layer | Choice | Why | Evidence |
|---|---|---|---|
| Switch | **FreeSWITCH + FusionPBX**, one Sydney VM (2–4 vCPU, 4–8 GB; ap-southeast-2 / australiaeast / DO SYD1; UDP 16384–32768 RTP + SIP), multi-tenant by FreeSWITCH domain | MPL, no seat fees; ring groups, weekday time conditions, after-hours greeting, voicemail-to-email, recording, CDR are configuration; ESL gives live ringing/answered/ended/agent events; SIP-over-WSS / Verto for browser calling | Stack lane 2026-09-09: docs.fusionpbx.com |
| Fallback switch | jambonz (open-source 0.9.x MIT; 10.x commercial licence) | Developer-native webhook model and CPaaS-style multi-tenant accounts, but no packaged mobile push SDK and a new licence uncertainty | jambonz.org, docs.jambonz.org |
| Mobile ringing on a locked phone | **Bought, not built**: Groundwire (Acrobits) ~$12.99 one-off per user, or Acrobits Cloud Softphone per-active-user; Sangoma Talk only if Asterisk/FreePBX were chosen | PushKit/CallKit ringing via the vendor's push relay; the hardest requirement is solved by a $13 app | Stack lane; acrobits.net |
| Desktop | Browser softphone embedded in crm7 later (SIP.js / JsSIP over WSS); FusionPBX web client or a desktop SIP app on day one | | |
| Events → CRM | ESL consumer (Node worker on the same VM or Railway if UDP is not needed there) → BSU edge function with the durable command/event contract Astra specified (idempotency key, session id, leg id) → `call_log` rows in `/communications` with agent attribution and called-back state | Astra §5 adopted | |
| Click-to-call | ESL `originate` from crm7: rings the staff extension (Groundwire app or WebRTC) then bridges to the client with the tenant's 04 as CLI. One PSTN leg, not two | FreeSWITCH originate | |
| Voicemail transcription | Azure Speech `australiaeast` (in-region, AU English) called from the ESL worker on the recording; storage in the tenant's Supabase bucket; retention setting per tenant | Microsoft-aligned; Astra §9 requires location + legal review before enabling | learn.microsoft.com speech regions |
| SMS | Mobile Message stays. Outbound from the 04 as a verified own number (proven for handsets); inbound replies must be delivered by the 04's carrier by webhook or email into `sms_inbound_persist` via a small adapter | §3.1, E2b | |
| Numbers | Tenant 04 "virtual mobile number" from the carrier (SIPcity from ~$10, Maxo $14.95, Voxbone via API, unverified rates); client's 1300 stays at Telcoworks and forwards to the 04, or ports later by Porting Authority Form (2–20 business days) | Carriage lane | |
| Billing | CDR from FreeSWITCH → `message_usage`-style `call_usage` with supplier leg seconds, retail conversation minutes, allowance, adjustments → existing invoice pipeline | Astra §5 | |

Kamailio/OpenSIPS edge is deferred until tenant count and NAT registration volume need it.

### 14.2 Carriage: two routes, staged

| | Route A: white-label reseller under an SME CSP | Route B: direct wholesale with a carrier-tier CSP |
|---|---|---|
| Who | Maxo (explicit white-label, virtual mobile numbers, SMS API "planned"), Aatrox ("no minimum commitment", tiered wholesale rate card; but its mobile/SMS is via Twilio, so use it for voice/1300 only), CrazyTel wholesale API, Swoop white-label, Over the Wire / NetSIP wholesale self-service, VoIPLine (white-label partners must hold their own TIO membership) | Symbio (Number Manager + Connect API for numbers, porting, CDRs; mobile numbers), Vocus wholesale voice/UCaaS, Aussie Broadband Wholesale. Telstra SIP Connect requires 100 channels; Optus enterprise-only |
| What we get | SIP trunk to our FreeSWITCH, DIDs, 04 VMNs, 1300 hosting, porting, under our brand; host CSP keeps IPND, 000 routing, and TCP Code programme in most models | The same at carrier rates, with a real provisioning API |
| What we take on | CSP status (we supply carriage to the public under our brand) and therefore TIO membership (minimum ~$400/yr ex GST + per-complaint case fees), TCP Code compliance attestations; IPND and 000 via the host | Everything: TIO, IPND next-business-day uploads, 000 obligations, TCP Code, TIA Act 2-year data retention, credit checks, minimum commitments |
| Lead time | 1–3 weeks (agreement, TIO application, trunk, number) | 4–8+ weeks, sales cycle and minimums |
| When it wins | Now, at 3 seats | When monthly minutes are in the tens of thousands or dozens of trunks, so the carrier rate card beats the reseller markup by more than the compliance cost |

**Staging:** Route A first, with the switch, apps, events and billing built once and carrier-neutral
behind a SIP trunk. Route B becomes a swap of trunk and number ownership when volume justifies
CSP registration in full. That is "our own version at wholesale cost" reached in two steps
without building compliance we cannot yet amortise.

Pending legislation: the Telecommunications Amendment (Enhancing Consumer Safeguards) Bill 2025
creates a formal CSP register; status unverified as of 2026-09-09; check before signing.

### 14.3 The one requirement that is still unproven

One number for calls and texts, Mobile Message sending, means inbound SMS to the 04 must be
delivered by the 04's carrier to us. VMN vendors advertise "two-way SMS" but no first-party
page found describes the delivery mechanism (webhook, email, API pull) or whether it survives
the number being used for voice on our trunk. This is RFQ question 1 to every shortlisted
carrier and a bench test before the agreement. Interim fallback that keeps every client promise
except "one number": Mobile Message dedicated number for texts.

### 14.4 Cost, owned stack (AUD ex GST; carrier rates are reseller-tier estimates until the RFQ returns)

| Item | Supplier cost | Note |
|---|---|---|
| Sydney VM for the switch | ~$60–120/mo | shared across all tenants |
| 04 virtual mobile number | $7.50–14.95/mo per tenant | SIPcity/APC/Maxo published |
| Outbound to AU mobile | ~5–12c/min, one leg | CrazyTel "from 5c", APC 10–12c, Aatrox 10c |
| Outbound to AU landline | 8–10c per call untimed | APC |
| Inbound to the 04 | not published; assume included or ~1–3c | RFQ |
| Telcoworks 1300 leg | client's own plan, 10–22.5c/min | unchanged |
| Groundwire | $13 one-off per user | 3 users = $39 |
| Azure Speech transcription | ~USD 1/hour audio | negligible at her volume |
| Mobile Message SMS | 2–4c out, replies free | |
| TIO membership | ≥ $400/yr + case fees | estate cost, not per tenant |

Client retail as drafted stays: $1,040 setup, $146/mo, 25c/min beyond the first hour, 7c–10c
texts. Margin per bridged minute improves from ~2c (Twilio two-leg) to ~13–20c, and the
overage can drop to 20c once the rate card is known. Medium scenario client total ≈ $146 +
$46 calls + $21 SMS + $60 Telcoworks ≈ $273/mo (was $412 on the Twilio bridge).

### 14.5 Timeline, honestly

| Phase | Work | Elapsed |
|---|---|---|
| P0 | Pin refs, ownership map, writers/grants; carrier RFQs (inbound SMS on 04, rates, minimums, TIO responsibility); TIO application if Route A requires it | week 1–2 |
| P1 | Sydney VM, FreeSWITCH + FusionPBX, tenant domain, trunk from the chosen CSP, 04 number, 1300 forwarded; Groundwire on three phones; ring group + weekday time conditions + after-hours + voicemail | week 2–4 |
| P2 | ESL worker → BSU command/event contract → `call_log` in `/communications` with attribution and called-back state; click-to-call via originate | week 4–7 |
| P3 | Mobile Message own-number verification on the 04; carrier inbound SMS adapter into `sms_inbound_persist`; comms-only tenant flags; ShiftCare CSV import | week 6–8 |
| P4 | Transcription (location review first), CDR → usage → invoice line; acceptance tests §11 + Astra's scenarios; five business days observation | week 8–10 |

Realistic go-live before red-team: 8–10 weeks. **After red-team (§14.7): about three months
for phase 1**, gated by carrier onboarding and the week-1 SMS bench test, not by code. The
client said she is not in a rush; the draft reply says "roughly three months".

### 14.6 RFQ to shortlisted carriers (send to Maxo, Aatrox, CrazyTel, Swoop, Over the Wire; Symbio for Route B pricing)

1. 04 virtual mobile number on a SIP trunk to our own FreeSWITCH: voice in/out with the 04 as CLI; **inbound SMS delivery mechanism** (webhook payload, email, API) and whether outbound SMS from a third party (Mobile Message own-number) on that number is permitted.
2. Rate card: DID rental, per-minute to AU mobile/landline, inbound, 1300 hosting and inbound, 13/1300 outbound; billing increment; setup and minimums.
3. Capacity: three concurrent calls per tenant minimum; channel pricing.
4. Compliance split: who holds TIO membership, IPND, 000, TCP Code under the white-label agreement; whether we must register as a CSP.
5. Porting: 1300 by PAF, lead time; 04 port-in/out.
6. API: number provisioning, CDR pull, porting status; webhook events if any.
7. White-label terms: branding, billing, support escalation, exit and number portability.

### 14.7 Red-team outcome (2026-09-09 12:05 AWST) and the changes adopted

Verdict on the §14 draft: NOT-READY on V1, V2, V3, V4, V6, V12. Every finding below is adopted
into the plan; none is deferred.

| ID | Finding | Change to the plan |
|---|---|---|
| V1 Critical | 000 emergency calling absent. An NDIS worker dialling 000 from an app during a crisis must not fail or present a Sydney location for a Perth caller | Define and bench-test 000 behaviour before P1; written carrier confirmation of 000 handling and location data on the 04; standard written notice to the client that the service is not a substitute for a mobile in an emergency. Phase 1 (below) keeps 000 on their own mobiles anyway |
| V2 Critical | Internet-facing PBX: toll fraud and FusionPBX admin CVEs | Hardening baseline is a P1 deliverable: TLS 5061 + WSS only, SIP restricted to carrier IPs, admin UI behind VPN or IP allowlist, random 24-char secrets, international dialling denied by default, fail2ban, carrier-side channel and spend caps, hourly spend alarm |
| V3 Critical | In Australia an 04 number's messaging is bound to one aggregator; "Mobile Message sends, the voice carrier receives" probably fails at that binding. Own-number verification proves outbound only | Moved from week 6–8 to **week 1** as a paid bench test on one carrier, with a null result expected. The client is told now, not in week 8: texts may need their own business number. Draft updated |
| V4 Critical | One VM, no failover: maintenance or a panic takes the client's only number off the air | Carrier-side failover destination on trunk-unreachable to a nominated mobile, set at provisioning; documented rebuild; uptime probe with SMS alert |
| V5 High | "Solved by a $13 app" is false: Acrobits push needs dialplan integration and wait-for-register logic; the relay is a third party on the ring path | Re-costed 5–10 days; proven on one handset before rollout; PSTN no-answer fallback to the staff mobile. And see the phase-1 shape below, which removes it from the critical path |
| V6 High | Supplying carriage under our brand makes us a CSP on day one; TIO, TCP Code and complaints handling are ours regardless of the host's commercial allocation | P0 item: written legal opinion (operator is a lawyer) plus the host CSP's written attestation of the compliance split, before any client agreement |
| V7 High | ESL is unauthenticated-by-default full call control; exposing it off-box is remote toll fraud plus call interception | ESL bound to loopback with ACL and rotated secret; the event worker lives on the VM; if ever remote, mTLS tunnel only |
| V8 High | ESL is a live stream with no replay; a worker restart silently under-reports `call_log` and R5 is wrong with no error | Persist raw events locally before acknowledging; nightly CDR reconciliation is the source of truth; alert on event gap |
| V9 High | Time conditions run on domain timezone; Sydney has DST, Perth does not | Tenant domain timezone Australia/Perth explicitly; NTP-locked VM; acceptance tests at 08:59 and 17:01 AWST either side of a DST boundary |
| V10 High | "Carrier-neutral" is untested against CLI presentation rules and number ownership; a hosted VMN may not be portable, making the two-step to Symbio a one-way door | RFQ item 7 now asks who holds the allocation, whether the 04 ports to another CSP, terms and lead time; the answer goes into the client agreement |
| V11 High | Four owners on the 1300 chain and no end-to-end monitoring: calls lost before the trunk appear nowhere, so R1 fails for exactly the class that matters | 15-minute synthetic canary call through the 1300; monthly reconciliation of the Telcoworks invoice against our call count |
| V12 High | 8–10 weeks not credible: carrier agreement, credit check and TIO realistically 3–8 weeks; push integration +2–4; SMS re-scope +2; NAT/audio tail | Quoted to the client as roughly three months; internal plan 12–16 weeks for phase 1 in the shape below |
| V13 Medium | FreeSWITCH domain separation is a convention; recordings and voicemail on one filesystem repeat the estate's cross-tenant leak class | Per-domain contexts with no shared default; recordings in per-tenant Supabase storage under RLS; a cross-domain dial attempt in the acceptance suite |
| V14 Medium | Inbound SMS adapter authentication unspecified | HMAC, mTLS or IP allowlist is an RFQ pass/fail; adapter writes to `sms_inbound_persist` only behind signature and replay-window checks |
| V15 Medium | Recording listed as configuration; WA Surveillance Devices Act 1998 all-party consent; NDIS call content is sensitive information under APP 11 | Recording off by default; consent announcement when enabled; per-tenant retention; encrypted per-tenant storage; access logged; Azure Speech data path confirmed before P4 |
| V16 Medium | "Margin improves to 13–20c" only applies to overage minutes; the $146 bundles the first hour; the client's saving is the removed second leg, not wholesale | Stated plainly: tenant one is loss-making by design against 12–16 weeks of build; tenant two is not anchored to $146; no wholesale saving is claimed to the client |

**Phase-1 shape adopted (the reviewer's "better way", within the rule).** Keep the owned
FreeSWITCH switch and the wholesale trunk exactly as designed, but do not put the three mobiles
on SIP in phase 1. The ring group forks to their existing mobile numbers over the trunk by the
weekday roster; outbound is click-to-call by `originate` with the 04 as CLI, ringing the staff
mobile first; voicemail, greeting, call log, attribution and the 1300 forward all work as
specified. This removes the push relay, UDP/NAT registration on carrier mobile networks and the
softphone attack surface from the critical path, keeps 000 on their own mobiles, and costs a
second inbound leg of roughly $20–48/month at her volume at reseller rates. Groundwire or a
WebRTC softphone becomes phase 2 once the switch has run clean for a month; desktop calling
arrives with it. Every promise in the operator's sent email except "in-app dialling" is met in
phase 1, and that was never promised.

**Phase-1 plan, revised**

| Phase | Work | Weeks |
|---|---|---|
| P0 | Pin refs, ownership, writers/grants; carrier RFQs (§14.6); legal opinion on CSP status + host attestation; TIO application; **week-1 SMS binding bench test on one carrier** | 1–3 |
| P1 | Sydney VM, FreeSWITCH + FusionPBX hardened per V2, tenant domain (Australia/Perth), trunk, 04 number, carrier failover to a mobile, 1300 forwarded; ring group forked to mobiles by roster; after-hours greeting + voicemail; 000 behaviour confirmed; canary call | 3–6 |
| P2 | ESL worker (loopback, persisted events) → BSU command/event contract → `call_log` in `/communications` with attribution and called-back state; click-to-call by originate; nightly CDR reconciliation | 6–9 |
| P3 | SMS per the bench-test result: own-number on the 04 if it passed, otherwise Mobile Message dedicated number; comms-only tenant flags; ShiftCare CSV import | 8–10 |
| P4 | Transcription (recording off by default; consent; location review), CDR → usage → invoice; acceptance §11 + Astra scenarios + V9/V13 cases; five business days observation | 10–13 |
| Phase 2 | Groundwire / WebRTC softphone with PSTN fallback; desktop calling; Kamailio edge when tenant count needs it; Route B carriage when volume justifies full CSP compliance | after a clean month |

Client-facing timing: roughly three months, date confirmed once the carrier is in place.
