---
kind: record
authority: none
owner: bsuite
---

# FutureBuild cannot connect Azure: the app registration is almost certainly single-tenant (needs operator, not code)

https://github.com/GaryOcean428/business-suite-unified/issues/916

Snapshot updatedAt: 2026-08-27T04:56:00Z. Open at capture; re-read live.

**Client FutureBuild cannot connect their Azure/Microsoft mailbox.** The code half of this is fixed in business-suite-unified#914 (the popup landed on the wrong app and never closed). **This half is not a code change** — it is an Azure app-registration setting, and only the operator can see or change it.

## The measurement that says it is Azure, not us

Production `email_integrations` holds **exactly one row**:

```
provider  microsoft      email  braden@braden.com.au
active    true           scopes Mail.Send, Mail.Read, Calendars.ReadWrite,
                                Calendars.Read.Shared, User.Read, offline_access
token_expires_at  2026-08-27 05:37   (not expired)
sync_status idle       error_message NULL
```

**FutureBuild has no row at all.** The integration row is written *before* the redirect, so a client who reached the callback would have one. They are failing **earlier** — at Microsoft's consent screen, before any of our code runs.

Our own token is fine and `Mail.Send` is granted, which is why "connects but can't send" is a *different* symptom (see #914 and D-2).

## The two documented causes, from Microsoft

Our code resolves the tenant as `AZURE_TENANT_ID || MICROSOFT_TENANT_ID || "common"`. The **default is correct** for multi-tenant, so the problem is one of these:

### Cause A — the app registration is single-tenant

> *"If your app registration is set to a single-tenant account type, users from other directories or identity providers can't sign in to that application."*
> — [AADSTS50020, Cause 2](https://learn.microsoft.com/troubleshoot/entra/entra-id/app-integration/error-code-aadsts50020-user-account-identity-provider-does-not-exist#cause-2-used-unsupported-account-type-multitenant-and-personal-accounts)

**Check:** Azure Portal → App registrations → *your app* → **Manifest** → `signInAudience`.

It must be one of `AzureADMultipleOrgs`, `AzureADandPersonalMicrosoftAccount`, or `PersonalMicrosoftAccount`. If it says **`AzureADMyOrg`**, that is the bug — every external tenant is rejected.

> ⚠️ **The catch:** *"You currently can't change signInAudience in the manifest."* The app registration has to be **re-created** with the correct account type. Budget for that: new client ID and secret, and `AZURE_CLIENT_ID` / `AZURE_CLIENT_SECRET` updated in the Supabase edge-function secrets.

### Cause B — `AZURE_TENANT_ID` is set to your own tenant

> *"If you use `https://login.microsoftonline.com/<YourTenantNameOrID>`, users from other organizations can't access the application."*
> — [AADSTS50020, Cause 3](https://learn.microsoft.com/troubleshoot/entra/entra-id/app-integration/error-code-aadsts50020-user-account-identity-provider-does-not-exist#cause-3-used-the-wrong-endpoint-personal-and-organization-accounts)

**Check:** Supabase → Edge Functions → Secrets → is `AZURE_TENANT_ID` set to a tenant GUID?

If yes, **unset it** (or set it to `organizations`). The correct value per Microsoft:

| Registration type | Value |
|---|---|
| Multitenant (orgs only) | `organizations` |
| Multitenant + personal accounts | `common` |
| Personal only | `consumers` |

**A note on which:** these are business mailboxes, so `organizations` is the better fit — a personal Microsoft account cannot be a client's work mailbox. If the registration is `AzureADMultipleOrgs`, our `common` default is actually a *mismatch* and should be `organizations`. Tell me which the registration says and I will change the code default to match.

### Cause C, worth ruling out while you are there

> *"If your application is an enterprise application that requires user assignment, error AADSTS50020 occurs if the user isn't on the list of allowed users."*
> — [Cause 6](https://learn.microsoft.com/troubleshoot/entra/entra-id/app-integration/error-code-aadsts50020-user-account-identity-provider-does-not-exist#cause-6-app-requires-user-assignment)

**Check:** Azure Portal → Enterprise applications → *your app* → Properties → **Assignment required** should be **No**.

## How to confirm in one minute

Have someone at FutureBuild start the connect and **read the error on Microsoft's own page** — it is displayed before any redirect back to us. If it begins `AADSTS50020`, it is Cause A or B. If it is `AADSTS65001`, it is unconsented permissions and their tenant admin needs to grant consent for `Mail.Send`.

## Acceptance criteria

- [ ] `signInAudience` confirmed NOT `AzureADMyOrg` (re-create the registration if it is)
- [ ] `AZURE_TENANT_ID` confirmed unset, or set to `organizations`
- [ ] **Assignment required** = No
- [ ] A FutureBuild user completes the connect and a second row appears in `email_integrations`
- [ ] That user sends a test email successfully
- [ ] Once the registration type is known, the code default (`common`) is aligned to it — mine to do, one line

Related: business-suite-unified#914 (popup/wrong-app, fixed), D-2 (SMTP/IMAP send path, owned by another lane).
