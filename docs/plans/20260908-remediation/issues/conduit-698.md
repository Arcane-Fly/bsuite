# main was promoted 30+ minutes ago and Vercel never created a deployment for it

https://github.com/GaryOcean428/conduit/issues/698

Snapshot updatedAt: 2026-09-07T10:30:07Z. Open at capture; re-read live.

## What is live vs what was merged

`main` = `a9edd79` (PR #697, merged ~09:47Z). Production serves:

```
$ curl -s 'https://conduit.crm7.app/version.json?cb=…'
{"commit":"9770eb4","builtAt":"2026-09-06T04:15:19.986Z"}
```

Yesterday's build. Confirmed with a cache-buster, so this is not CDN caching.

## Vercel created no deployment for that commit

From the deployments list for `prj_EpTqQLe4muwr0E18AZoWcMRgUuT7`, the three most recent are all `target: null` (preview):

| commit | ref | target |
| --- | --- | --- |
| `b80fd1d` | `development` | preview |
| `0f1c26c` | `chore/lockfile-reach` | preview |
| `f459baf` | `chore/lockfile-reach` | preview |
| `9770eb4` | `main` | **production** (2026-09-06) |

There is **no deployment record for `a9edd79` in any target**. The GitHub deployments API agrees: the newest `environment=Production` entry is `9770eb4` from yesterday, and no deployment exists for `a9edd79`.

## It is specific to this repo, not to the promotion round

Three sibling apps were promoted in the same ten minutes and every one deployed:

| app | production deployment | commit |
| --- | --- | --- |
| braden | 2026-09-07T09:50:14Z | `31b7d7b` |
| throughput | 2026-09-07T09:50:21Z | `3a56985` |
| business-suite-unified | 2026-09-07T09:56:08Z | `b4c58c5` |
| **conduit** | **none** | — |

And conduit's own history shows `main` normally deploys — `9770eb4`, `e48c1937`, `dee8958e` were all `target: production` off `main`, created by `vercel[bot]`.

So the integration works and the push to `main` produced nothing. A missed webhook delivery is the most likely cause; that is inference, not measurement.

## Consequence

`main` and `development` are content-identical and CI is fully green on `main`, so the code is fine — but **nothing merged into conduit today is actually serving.** Merged is not shipped, and the estate's `version.json` convention is what makes that visible.

## Unblock — needs access I do not have

Either of these, both a few seconds:

1. **Vercel dashboard** → conduit project → the `main` deployment → **Redeploy**; or
2. **GitHub** → conduit → Settings → Webhooks → the Vercel hook → **Recent Deliveries** → redeliver the `push` for `a9edd79`.

I cannot do either: my token carries `gist, read:org, repo, workflow` — no `admin:repo_hook` — and the Vercel tooling available here only deploys an uploaded file tree, which would create a **non-git deployment** and detach production from the git integration. That would be worse than the current state, so I have deliberately not done it.

Once redeployed, the check is `curl -s 'https://conduit.crm7.app/version.json?cb=1'` returning `a9edd79`.
