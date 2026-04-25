# Archive: `braden/fix/dom-layout-lint-heredoc-delimiter`

**Captured:** 2026-04-25
**Classification:** (d) unique-but-superseded
**Action:** archive + delete

## Why superseded

This branch fixed the DOM Layout Lint workflow's heredoc delimiter using `openssl rand -hex 16`. A different fix (PR #148 / `d2d4bc0`) had already landed in main using a similarly randomised delimiter, and PR #150 (`a782d69`) added the trailing-newline complement. The two fixes diverged on cosmetic detail; main's version is canonical.

## Two-signal check

- **grep** `git log origin/main --grep "heredoc delimiter"` → no match. `git log origin/main --grep "DOM Layout Lint"` → `a782d69 fix(braden): DOM Layout Lint — add trailing newline before heredoc delimiter`, `d2d4bc0 fix(braden): DOM Layout Lint workflow — use random delimiter instead of 'EOF' (#148)`.
- **content** `git log origin/main -S "random heredoc"` → no match. The exact diff (`DELIMITER="LINT_SUMMARY_$(openssl rand -hex 16)"`) is not in main; main uses a similar but distinct random-delimiter pattern from PR #148.

Conclusion: same intent already addressed by different commits in main; this branch's specific implementation is not needed.

## Full `git log -p <branch> --not main`

```
commit fb3ed8409fc5e0c9e9f86ab70432b2f8aad2bb59
Author: Braden Lang <braden.lang77@gmail.com>
Date:   Wed Apr 22 07:58:26 2026 +0000

    fix(braden): use random heredoc delimiter in DOM Layout Lint workflow

    The fixed `EOF` delimiter in the GITHUB_ENV write causes GitHub Actions to
    error with 'Matching delimiter not found EOF' whenever $SUMMARY contains the
    literal string EOF (e.g. from markdown fences or file-path listings).

    Fix: generate a random delimiter per GitHub Actions docs recommendation for
    multi-line environment variables.

    Reference: https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/workflow-commands-for-github-actions#multiline-strings

diff --git a/.github/workflows/dom-layout-lint.yml b/.github/workflows/dom-layout-lint.yml
index dc06bed..80178f7 100644
--- a/.github/workflows/dom-layout-lint.yml
+++ b/.github/workflows/dom-layout-lint.yml
@@ -148,10 +148,11 @@ jobs:

           printf "%b" "$SUMMARY" >> "$GITHUB_STEP_SUMMARY"

+          DELIMITER="LINT_SUMMARY_$(openssl rand -hex 16)"
           {
-            echo 'LINT_SUMMARY<<EOF'
+            echo "LINT_SUMMARY<<${DELIMITER}"
             printf "%b" "$SUMMARY"
-            echo 'EOF'
+            echo "${DELIMITER}"
           } >> "$GITHUB_ENV"

           if [ ${#ERRORS[@]} -gt 0 ]; then
```
