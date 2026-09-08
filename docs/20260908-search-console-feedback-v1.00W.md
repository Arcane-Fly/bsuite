# Braden Search Console feedback — 8 September 2026

Scope: BSuite Braden site only. Braden explicitly excludes Get Muscles. Personal Gmail was accessed in the actual signed-in Chrome browser through the available extension. Hermes thread 20260907_154113_5ef169 documents real-browser access; it is browser context, not a prior SEO diagnosis.

Mailbox searches: quoted Search Console returned 29 conversations including one unrelated vendor newsletter; in:anywhere from:sc-noreply@google.com returned 28 conversations with no further page. Braden actionable alert categories: recurring redirects, July other-4xx, March canonical alternate, historical September 2025 duplicates and 404s. Association/ownership/onboarding and achievement notices were not classified as defects. The 7 September redirect and 18 July 4xx full message bodies were read; other historical categories were captured from list previews then checked against the live domain report. Private mail/recipient details are not reproduced.

GSC report last update 4 September 2026: domain 1 indexed / 5 excluded (3 redirect, 1 other-4xx, 1 proper-canonical alternate). www property 0 indexed / 2 excluded is not a domain-wide zero. Redirect examples: http://braden.com.au/ and https://www.braden.com.au/ (3 September crawl), http://www.braden.com.au/ (28 August). Alternate: https://www.braden.com.au/?nocache=1&heal=js (29 August). Other-4xx: https://links.coms.braden.com.au/ (14 July crawl; first detected 11 July). Apex and domain Sitemaps views have zero submitted rows; www remains an implementation check.

Fresh public HTTP checks on 8 September: apex requests finish at www with 200; raw homepage title Braden and no canonical link; live sitemap is XML with 9 apex URLs, all dated 2026-02-28; robots advertises apex sitemap; tracking root returns 400. Current HTTP behavior differs from Google's older redirect report, so no untested historical diagnosis is asserted. Raw HTML absence does not prove JavaScript rendering failure.

The existing source SEOHead BASE_URL is apex while operations docs name www. vercel.json uses build:noprerender; the recovered prerender plan's delivered designation is historical, not proof of current Google results. SEOHead Organization and LocalBusiness wording differs: reconcile with existing braden#371. No application code, DNS, provider, sitemap submission or production deployment was changed in this intake.

## Remediation tasks and discrete prompts

- [[P1][Search Console] Reconcile Braden canonical host, live redirects and repeated indexing alerts](https://github.com/GaryOcean428/braden/issues/607) — [kickoff](plans/20260908-remediation/prompts/braden-607.md).
- [[P2][Search Console] Resolve links.coms.braden.com.au 4xx alert with verified tracking-host disposition](https://github.com/GaryOcean428/braden/issues/608) — [kickoff](plans/20260908-remediation/prompts/braden-608.md).
- [[P1][Search Console] Verify Braden public-page discovery, sitemap coverage and deployed SEO rendering](https://github.com/GaryOcean428/braden/issues/609) — [kickoff](plans/20260908-remediation/prompts/braden-609.md).

Use the linked plan and programme bsuite#3204. All three prompts carry release contract v2, required skills, paired review agents, model quota constraints and explicit criteria. Issues remain open; this intake does not certify remediation.

Primary guidance: [Google Page indexing report](https://support.google.com/webmasters/answer/7440203). Correct alternate/redirect exclusions need not disappear; inspect the intended canonical page and verify unexpected failures.

## Suite-wide public website addendum

The operator subsequently clarified that all six BSuite landing sites require consistent reciprocal public navigation and SEO/AEO/GEO. Braden-specific Search Console observations above remain scoped to Braden. See [suite-wide plan and discrete prompts](plans/20260908-public-website-navigation-discoverability-v1.00W.md); issues bsuite#3224 and bsuite#3225 coordinate the additional work. Get Muscles remains excluded.
