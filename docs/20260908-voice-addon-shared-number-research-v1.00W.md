---
kind: research
authority: agent
owner: bsuite
---

# Voice add-on and shared business number — research record

**Status:** W (working) · **Date:** 2026-09-08 · **Author:** Claude Code (bsuite lane), red-teamed twice
**Trigger:** inbound enquiry from Rahawa Abraham, Service Coordinator, Life Purpose Australia (NDIS
provider, Wembley WA), 08 Sep 2026 10:26 AWST, subject "Shared Business Phone & Messaging System"
**Relates to:** `20260828-messaging-platform-design-v1.00W.md` (SMS on Mobile Message; §14 fees)
**Operator rulings absorbed:** (1) SMS stays on Mobile Message; (2) an own number can be kept in
Mobile Message; (3) the inbound-SMS-not-in-inbox gap is a registered crm7 defect in the Hermes
queue, not this lane's work.

This is the record of what was researched, in what order, what was wrong, and what the numbers
are. The client-facing draft and the quote are downstream of this file.

---

## 1. The ask

Three office staff, each with a work mobile. A 1300 number with Telcoworks forwards inbound
calls to one mobile. Wanted, verbatim from the email: see incoming and missed calls; client SMS
in one shared inbox; reply from the same business number; outgoing calls showing the business
number; see if a colleague already replied or called back; access from mobiles and desktop.
"One central business number that all 3 office staff can use."

## 2. How the answer was reached, in order, including the wrong turns

| Step | What was checked | Result | Corrected by |
|---|---|---|---|
| 1 | Outlook thread | Inbound email + an unsent draft by Braden ("Yes this is something I can do... my crm already does the sms part") | — |
| 2 | crm7 + BSU source (Explore lane, read-only) | SMS provider WIRED = Mobile Message (`business-suite-unified/supabase/functions/_shared/sms-provider.ts`); send path `crm7/src/services/emailService.ts` → BSU `email-dispatcher`; inbound webhook `sms-inbound`; number claim `sms-numbers` against live `GET /v1/senders`; outbound SMS renders in `/communications`; **inbound SMS lands in `message_usage` with zero readers in crm7/src**; voice ABSENT; feature flags (`tenant_settings.feature_flags`, ~37 keys) support a comms-only tenant; VitePWA manifest + SW present; web push absent; dead Twilio adapter `crm7/src/lib/smsAdapter.ts` with zero importers | Operator: inbound gap already registered, Hermes queue |
| 3 | `docs/20260828-messaging-platform-design-v1.00W.md` | Mobile Message chosen; dedicated numbers free; bill 7c prepaid / 6c recurring; §14 onboarding $450 incl. core number, contactable window, consent flow, **5 templates, handover** | — |
| 4 | `business-suite-unified/src/lib/pricing.ts` | crm7 Basic $29 / Professional $59 / Enterprise $99 per user per month | — |
| 5 | mobilemessage.com.au/pricing | 1.6c first purchase then 2–4c; first dedicated number free, extra $100/yr; inbound free; **no voice product** | — |
| 6 | **Wrong turn.** From step 5 I concluded SMS number ≠ voice number, wrote "two business numbers by default" into the draft as question 1 and into memory as a ruling | Operator: "you can keep your own number in Mobile Message too" | Mobile Message API docs: sender classes are dedicated/shared number, alphanumeric, **own number** (verified by code). Replies to an own-number go to that number's own inbound path, not Mobile Message. So the Twilio voice number can be the SMS sender. One number. |
| 7 | **Wrong turn.** Priced voice at 15c/min overage and $39/300 min | Commercial red-team | Twilio prices are USD; the click-to-call bridge is two legs; AU mobile number is USD 20/mo. See §5 |
| 8 | **Wrong turn.** Offered "show the 1300 on outgoing calls" | Telephony red-team | 1300/1800 are inbound-only in AU (Do-Not-Originate); never outbound caller ID |
| 9 | **Wrong turn.** "Voicemails transcribed into the inbox" as a $95 toggle | Telephony red-team | Twilio `<Record transcribe>` is US-English only; AU needs Voice Intelligence ~USD 0.028/min |
| 10 | Email length and tone | Comms red-team | 19 questions under 5 headings cut to 8 flat; competitor sentence removed; jargon out |
| 11 | Offset against existing costs | Not done until asked | §7 |
| 12 | Existing-software questions | Cut by the comms red-team as "can wait"; operator restored them for the subscription-offset play | §7b; draft Q7–Q9 |

Lesson recorded in agent memory: a vendor's marketed category is not its binding mechanics; a
USD unit rate is not an AUD price until legs and FX are applied.

## 3. Constraints that decide the architecture (verified)

| Fact | Source |
|---|---|
| Only mobile-type (04) numbers do two-way SMS in AU on Twilio; local (08) are voice-only | https://support.twilio.com/hc/en-us/articles/223135367 ; https://support.aircall.io/hc/en-gb/articles/10375395914781 |
| 1300/1800 cannot receive SMS; toll-free SMS exception is US-only | https://help.twilio.com/articles/115007579027 |
| 1300 (Special Service) and 1800/1900 must be used for inbound only; not usable as outbound caller ID | https://www.twilio.com/en-us/guidelines/au/voice |
| Twilio AU mobile numbers do two-way SMS | https://www.twilio.com/en-us/guidelines/au/sms |
| AU numbers need a Twilio regulatory bundle (name, AU address, ID docs) | https://www.twilio.com/docs/phone-numbers/regulatory/faq |
| Ring-all bills only the answered leg | https://dev.classmethod.jp/en/articles/twilio-call-api-unanswered-ringing-billing-verification/ |
| `<Record transcribe>` is American English only; Voice Intelligence supports en-AU | https://www.twilio.com/docs/voice/twiml/record ; https://www.twilio.com/en-us/changelog/multi-language-voice-intelligence |
| ACMA SMS Sender ID Register (1 Jul 2026) covers alphanumeric IDs only; numeric senders out of scope | https://www.acma.gov.au/sms-sender-id-register-rules-telcos ; https://www.twilio.com/en-us/blog/insights/australia-sender-id-register |
| Mobile Message: SMS only; own-number sender class; 5 concurrent requests, 10,000 messages per request | https://mobilemessage.com.au/pricing ; https://mobilemessage.com.au/api-documentation |
| Mobile Message own-number replies do not reach the Mobile Message inbox; opt-outs are the customer's to manage | Mobile Message FAQ; same class documented by Sinch/MessageMedia and ClickSend |
| crm7 Basic includes the communications module: `/communications` gated on the `email_integration` flag, tier gates only Jodie AI and billing | `crm7/src/App.tsx`, `crm7/src/hooks/useFeatureFlags.ts`, `entitlement.ts` |

**Unverified, and the test that settles it:** whether Mobile Message accepts a CPaaS-hosted 04
as an own number. Ten minutes on Braden's own Mobile Message account: Settings > Numbers > My
own numbers, add an existing Twilio AU number, confirm the code arrives on the Twilio inbound
webhook, confirm the number lists in `GET /v1/senders`, send one SMS, reply, confirm the reply
lands in `sms-inbound`, confirm `sms-inbound` suppresses sends after STOP.

## 4. Providers considered

### 4a. Build path, CPaaS (Twilio; prices USD from twilio.com/en-us, AUD at 0.65)

| Item | USD | AUD |
|---|---|---|
| AU mobile number | 20.00/mo | 30.77 |
| AU local number | 3.00/mo | 4.62 |
| AU toll-free (1300/1800) number | 20.00/mo | 30.77 |
| Outbound SMS (mobile sender) | 0.0515/segment | 0.079 |
| Inbound SMS | 0.0075/segment | 0.0115 |
| Outbound call to AU mobile | 0.0750/min | 0.115 |
| Outbound call to AU landline | 0.0252/min | 0.039 |
| Inbound call to mobile number | 0.0500/min | 0.077 |
| Inbound call to local number | 0.0100/min | 0.015 |
| Voice SDK (browser/app) leg | 0.0040/min | 0.006 |
| Voice Intelligence transcription | ~0.028/min | 0.043 |

Sources: https://www.twilio.com/en-us/sms/pricing/au , https://www.twilio.com/en-us/voice/pricing/au
Telnyx, Vonage, Sinch AU line items not individually verified; treat as near parity.

### 4b. Mobile Message (live SMS provider)

1.6c first purchase, 2–4c standard; first dedicated number free, additional $100/yr; inbound
free; no voice. Estate bills 7c prepaid / 6c recurring (design doc §6).

### 4c. Buy path, off-the-shelf shared-number products

| Product | AU 04 number | Two-way AU SMS | Shared inbox with attribution | Mobile + desktop | Price (AUD ex GST) | Source |
|---|---|---|---|---|---|---|
| OpenPhone (Quo) | **No AU numbers** | — | — | — | disqualified | https://support.quo.com/core-concepts/phone-numbers/local-numbers |
| Aircall | Yes | Mobile numbers only | Yes | Yes | ~45–70+/seat/mo | https://aircall.io/en-au/pricing/ |
| JustCall | Yes incl. 1800 | Yes | Yes | Yes | from ~US$29/seat | https://justcall.io/hub/virtual-phone-number/australia/ |
| Dialpad | Yes, AU mobile DID + SMS | 250 msgs/user then $0.008 | Yes | Yes | ~US$15–25/user | https://www.dialpad.com/press/mobile-did-au-support/ |
| RingCentral AU | Yes | Yes; toll-free SMS add-on $30 + $4.99/mo | Yes | Yes | ~74.99/user (Premium) | https://support.ringcentral.com/au/en/article-v2/Enhanced-Business-SMS-new-Price-Changes.html |
| Zoom Phone | Yes; SMS needs mobile-type number | Yes | Team Chat | Yes | from ~US$10.50 + regional | https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0057987 |
| 3CX | Via SMS gateway (Mobile Message, Breeze) | Yes via gateway | Per queue | Yes | licence + gateway fees | https://insider.mobilemessage.com.au/mobile-message-3cx-sms-integration-guide/ |
| SIPcity Shared SMS (AU) | Yes, 04 issued | **Purpose-built** | Central thread | Web + mobile | quote | https://sipcity.com.au/features/shared-sms/ |
| Pickle (AU) | Yes, 04 | **Purpose-built** | Shared inbox | Any device + portal | 25 / **45** / 69 flat per team | thinkpickle.com.au |
| MyNetFone/Vonage, Whispir, Burst/Kudosity | Yes | Broadcast-oriented | Not the use case | varies | enterprise | not verified |

Read: mainstream products cost A$135–225/mo for three seats with unlimited AU calling but no
shared client record. Pickle and SIPcity are the cheapest fit for the phone piece alone.

### 4d. HubSpot

Calling supported in AU; outbound to Telstra numbers can be spam-filtered unless a HubSpot AU
number is used (https://knowledge.hubspot.com/calling/what-countries-are-supported-by-calling).
Sales Hub Starter 500 min/mo from ~$20/seat; Professional 3,000 min + 3 numbers ~$90–100/seat
plus onboarding fee (fee not verified current). Native SMS is one-way marketing (~$75/mo per
1,000 segments); conversational SMS needs Aircall / Kixie / JustCall / CloudTalk. Life Purpose
uses HubSpot forms on its site (share-na2.hsforms.com); plan unknown.

### 4e. NDIS practice platforms

ShiftCare has a public API + webhooks (Premium/Enterprise) and a HubSpot integration
(https://help.shiftcare.com/en/articles/13906196-managing-api-keys). Brevity, SupportAbility,
Lumary (Salesforce-native), Splose common for small WA providers; none confirmed to have built-in
call/SMS logging. Which one Life Purpose uses is unknown; asked.

### 4f. Telcoworks (their current 1300 provider)

1300 cloud routing, divert to mobile or landline, simultaneous ring to multiple answerpoints,
optional call reporting. Plans $10 (promo, 3.75c/min to mobile), $40 Platinum (all features),
$80 unlimited with IVR; low-volume plans from 7.5c/min; billed per second after the first minute.
No SMS on 1300. Sources: https://telcoworks.com.au/plans/virtual-numbers/promo/ ,
https://telcoworks.com.au/blogs/1300-numbers/1300-numbers-cost/

## 5. Cost model (AUD)

| Shape | Per minute | Working |
|---|---|---|
| Bridged outbound (click-to-call: staff leg + client leg) | **0.231** | 2 × USD 0.075 ÷ 0.65 |
| Inbound answered on a mobile (1300 → Twilio number → dial out) | **0.192** | (USD 0.05 + 0.075) ÷ 0.65, plus Telcoworks' own 3.75–7.5c on the 1300 leg |
| Softphone outbound (Voice SDK + PSTN) | 0.122 | (0.004 + 0.075) ÷ 0.65 |
| Softphone inbound | 0.083 | (0.05 + 0.004) ÷ 0.65 |
| Twilio number | 30.77/mo | USD 20 ÷ 0.65 |
| SMS out via Mobile Message | 0.02–0.04 | |
| SMS out via Twilio (fallback) | 0.079 | |
| SMS in via Twilio | 0.0115 | |

The mobile-forwarding shape is the expensive one. If the client is call-heavy (over ~150
min/month) the PWA softphone should be phase 1, not phase 2, and the per-minute rate can drop.

## 6. Quote as drafted (ex GST)

| Line | Amount | Margin |
|---|---|---|
| Core setup: Twilio number + regulatory bundle, Mobile Message own-number verification, comms-only tenant, 3 logins, ring-all routing, 5 templates, setup guide, handover | $450 | matches design doc §14; a floor, not cost-derived |
| Optional: 1300 changeover $95; install walkthrough $120; training $250 remote / $450 onsite; templates beyond 5 $95 each; contact import $150; voicemail transcription $95 + 5c/min; after-hours routing $150; call recording with consent $350; HubSpot activity sync $650; desktop softphone $950 + $10/user/mo | | transcription cost 4.3c/min |
| crm7 Basic × 3 | $87/mo | |
| Voice add-on: number + 60 minutes | $59/mo | cost 30.77 + 60 × 0.231 = 44.6 → ~$14 |
| **Monthly** | **$146/mo** | |
| Calls beyond 60 min, in or out | 25c/min | cost 19–23c bridged, 8–12c softphone |
| SMS | 7c own-number path / 10c Twilio fallback; replies free to client | cost 2–4c or 7.9c, + 1.15c inbound |
| Delivery | ~4 weeks from go-ahead | ~16 dev days, single unbenchmarked estimate |

At 400 min/month: $146 + 340 × 0.25 = $231 + SMS.

## 7. Offset against their existing phone costs

| Their cost today | Estimate | After |
|---|---|---|
| Three work mobiles | unknown, typically $30–60 each | **Unchanged.** The bridge calls their mobiles; the PWA runs on them. Nothing is replaced. |
| Telcoworks 1300 | $10–40/mo + 3.75–7.5c/min | **Unchanged and still needed** in front for inbound. Porting the 1300 to Twilio would cost USD 20/mo + USD 0.05/min inbound, more than Telcoworks. |
| Inbound call handling | Telcoworks 3.75–7.5c/min to one mobile | Same Telcoworks leg **plus** ~19c/min through the system when answered on a mobile |

**Conclusion: the proposal is additive, about $146/month plus usage on top of what they pay now,
and inbound calls routed through the system cost roughly five times what Telcoworks alone
charges per minute.** What they buy for that is the shared inbox, attribution, missed-call
visibility, outbound caller ID and a client record. A cheaper hybrid exists if inbound
visibility matters less than cost: leave inbound ring-all on Telcoworks Platinum ($40, supports
simultaneous ring), use the system only for outbound calls, SMS and the record. Missed inbound
calls would then not appear in the inbox unless Telcoworks' call reporting is polled. Offered to
the operator as an option, not put to the client.

## 7b. Subscription offset: what crm7 could displace (operator direction 15:58 AWST)

The operator's read: some of the perceived cost can be met by retiring subscriptions the CRM
already covers. Nothing here is confirmed for this client; the draft asks (Q7–Q9) what she pays
for today. What crm7 has that could stand in, and what it cannot:

| Likely existing tool | What it does for them | crm7 today | Offset verdict |
|---|---|---|---|
| HubSpot (forms confirmed on site; plan unknown) | Contact list, web enquiry form, maybe pipeline, maybe Starter calling | Contacts, pipeline, lead-capture forms (see memory: 2 of 4 lead-capture asks built), email via Microsoft/Google OAuth | **Plausible.** HubSpot Starter is ~$20/seat/mo; if that is all they use, crm7 Basic replaces it. If they are on Professional for marketing automation, no. |
| NDIS platform (ShiftCare / Brevity / Lumary / CareMaster / SupportAbility; unknown) | Rostering, shift notes, NDIS price-guide claiming, participant plans | None of that. crm7 is GTO-shaped, not NDIS-shaped | **No.** Do not pitch replacement. Integrate: push call/SMS activity in where an API exists (ShiftCare has one). |
| Microsoft 365 (Bookings link in her signature) | Email, calendar, Bookings | Email sync exists; calendar and bookings do not replace M365 | **No.** Stays. |
| Telcoworks 1300 | Inbound number | Needed in front | **No.** Stays; see §7. |
| Forms / e-sign / booking add-ons if any | Enquiry forms, service agreements | Forms yes; e-sign has an architecture doc in `docs/recovered/` but confirm wired before claiming | **Maybe**, item by item after Q9. |

Rule for the firm quote: only count an offset once the tool, its plan and its price are named
by the client, and only where the replacing crm7 surface is WIRED (not built-unwired) at the
time of quoting.

## 8. Risks

- Mobile Message may reject a CPaaS 04 as an own number → Twilio SMS fallback on the same number.
- Twilio regulatory bundle approval needs the client's ABN and address documents; days.
- Own-number path shifts Spam Act 2003 STOP handling to `sms-inbound`; confirm before go-live.
- Mobile-forwarding per-minute cost; softphone halves it.
- Call recording of NDIS participants: consent and Privacy Act; only if asked.
- PWA and push are code-traced, not live-tested on a phone; iOS push needs home-screen install.
- HubSpot sync depends on the client's plan exposing the engagements API.

## 9. Build order if won

Twilio number + bundle + 1300 forwarding + ring-all + voicemail audio → `call_log` in
`/communications` with attribution and called-back state → click-to-call bridge → own-number
verification + STOP enforcement on that path → comms-only tenant + PWA install + web push →
handover. Build the voice module estate-wide; GTO field officers have the same need.
