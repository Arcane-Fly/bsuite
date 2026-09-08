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

**Status:** W (working) · **Version:** 1.01 · **Date:** 2026-09-08 (reopened 16:16 AWST) ·
**Author:** Claude Code (bsuite lane) · **Supersedes:** v1.00W of the same date
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

## 12. Client email

The revised email is in the operator's Outlook Drafts (thread "Shared Business Phone &
Messaging System"), not reproduced here.
