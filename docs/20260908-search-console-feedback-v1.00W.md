---
kind: record
authority: none
owner: bsuite
---

# Braden Search Console feedback — 8 September 2026

Scope: BSuite Braden site only. Braden explicitly excludes Get Muscles. Personal Gmail was accessed in the actual signed-in Chrome browser through the available extension. Hermes thread 20260907_154113_5ef169 documents real-browser access; it is browser context, not a prior SEO diagnosis.

Mailbox searches: quoted Search Console returned 29 conversations including one unrelated vendor newsletter; in:anywhere from:sc-noreply@google.com returned 28 conversations with no further page. Braden actionable alert categories: recurring redirects, July other-4xx, March canonical alternate, historical September 2025 duplicates and 404s. Association/ownership/onboarding and achievement notices were not classified as defects. The 7 September redirect and 18 July 4xx full message bodies were read; other historical categories were captured from list previews then checked against the live domain report. Private mail/recipient details are not reproduced.

GSC report last update 4 September 2026: domain 1 indexed / 5 excluded (3 redirect, 1 other-4xx, 1 proper-canonical alternate). www property 0 indexed / 2 excluded is not a domain-wide zero. Redirect examples: http://braden.com.au/ and https://www.braden.com.au/ (3 September crawl), http://www.braden.com.au/ (28 August). Alternate: https://www.braden.com.au/?nocache=1&heal=js (29 August). Other-4xx: https://links.coms.braden.com.au/ (14 July crawl; first detected 11 July). Apex and domain Sitemaps views have zero submitted rows; www remains an implementation check.

Fresh public HTTP checks on 8 September: apex requests finish at www with 200; raw homepage title Braden and no canonical link; live sitemap is XML with 9 apex URLs, all dated 2026-02-28; robots advertises apex sitemap; tracking root returns 400. Current HTTP behavior differs from Google's older redirect report, so no untested historical diagnosis is asserted. Raw HTML absence does not prove JavaScript rendering failure.

The existing source SEOHead BASE_URL is apex while operations docs name www. vercel.json uses build:noprerender; the recovered prerender plan's delivered designation is historical, not proof of current Google results. SEOHead Organization and LocalBusiness wording differs: reconcile with existing braden#371. No application code, DNS, provider, sitemap submission or production deployment was changed in this intake.

## Remediation tasks and discrete prompts

- [[P1][Search Console] Reconcile Braden canonical host, live redirects and repeated indexing alerts](https://github.com/GaryOcean428/braden/issues/607) — kickoff prompt kept with the remediation queue, not in this repository.
- [[P2][Search Console] Resolve links.coms.braden.com.au 4xx alert with verified tracking-host disposition](https://github.com/GaryOcean428/braden/issues/608) — kickoff prompt kept with the remediation queue, not in this repository.
- [[P1][Search Console] Verify Braden public-page discovery, sitemap coverage and deployed SEO rendering](https://github.com/GaryOcean428/braden/issues/609) — kickoff prompt kept with the remediation queue, not in this repository.

Use the [linked plan](plans/20260908-search-console-remediation-refined-v1.00W.md) and programme bsuite#3204. All three prompts carry release contract v2, required skills, paired review agents, model quota constraints and explicit criteria. Issues remain open; this intake does not certify remediation.

Primary guidance: [Google Page indexing report](https://support.google.com/webmasters/answer/7440203). Correct alternate/redirect exclusions need not disappear; inspect the intended canonical page and verify unexpected failures.

## Suite-wide public website addendum

The operator subsequently clarified that all six BSuite landing sites require consistent reciprocal public navigation and SEO/AEO/GEO. Braden-specific Search Console observations above remain scoped to Braden. See [suite-wide plan and discrete prompts](plans/20260908-public-website-navigation-discoverability-v1.00W.md); issues bsuite#3224 and bsuite#3225 coordinate the additional work. Get Muscles remains excluded.

## braden#607 status — 11 September 2026

**Done on braden development, not in production.** [GaryOcean428/braden#616](https://github.com/GaryOcean428/braden/pull/616) merged to braden `development` as merge commit `9dd2fdd98177f41db4824b1a2585f2aefc67ce44` (parents `f8f189e` and `bfb8460`). Measured on the preview host `https://d.braden.com.au` at 2026-09-11T03:00:01.314Z:

- `version.json` reports commit `9dd2fdd` (built 2026-09-11T02:59:19.854Z), the merge commit.
- `robots.txt`, `sitemap.xml`, `llms.txt` and `llms-full.txt` are served with www URLs only (www/apex counts: 2/0, 9/0, 13/0 and 18/0).
- The entry bundle (`/assets/index-sazJG6da.js`) carries 0 apex literals, and the served HTML carries 0 static canonical tags, so each canonical below was read from the rendered page.
- 12 public routes each render exactly one self canonical on `https://www.braden.com.au`, with a matching `og:url`: `/`, `/apprenticeships`, `/traineeships`, `/recruitment`, `/products`, `/contact`, `/privacy`, `/terms`, `/services/compliance`, `/services/mentoring`, `/services/technology` and `/services/future-services`.
- The heal URL `/?nocache=1&heal=js` canonicalises to the clean root, `https://www.braden.com.au/`.
- A not-found path (`/no-such-page-devverify`) renders `noindex` with no canonical.
- The 12 www canonical targets each answer 200 with no redirect.

Method, as recorded: curl GETs, plus Chrome 153 driven by Playwright (channel `chrome`, service workers blocked). Evidence record: `~/.agents/state/braden-607-development-verified.json`, kept on the operator's machine and not in this repository. The canonical-host rules themselves are recorded in the [platform operations reference](20260731-platform-operations-reference-v1.00W.md).

**Not done:**

- Production (`https://www.braden.com.au`) still serves the old apex canonicals until braden `development` is promoted. That promotion is held on the `@bsuite/theme` 1.5.2-next.0 prerelease pin ([bsuite#3241](https://github.com/GaryOcean428/bsuite/issues/3241)).
- Google URL Inspection and Validate Fix need the operator's signed-in Search Console. No Google-side result is claimed here.
- The apex-to-www redirect is a 307. It is a Vercel domain setting, not application code.
- CMS slug pages were not measurable: the only published Braden `content_pages` rows (privacy, terms) are shadowed by the static `/privacy` and `/terms` routes, so no published CMS page reaches `DynamicPage`.
- braden#607 stays open.
