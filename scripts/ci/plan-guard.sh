#!/usr/bin/env bash
# Plan guard for pull requests into the v2 trunk (docs/art-spec.md, task T0.3).
#
# The v2 plan (docs/) lives only on origin/v2 and only Daniele changes it.
# This check fails a pull request when either:
#   1. it changes anything in docs/ and its branch isn't named docs/*; or
#   2. the latest commit on the base branch that touched docs/ isn't an
#      ancestor of the PR head, so the branch predates a plan change.
#
# Usage: plan-guard.sh <head-branch-name> <head-sha> [base-ref]
# Needs full history for the base branch and the head commit.
set -euo pipefail

head_branch="${1:?usage: plan-guard.sh <head-branch-name> <head-sha> [base-ref]}"
head_sha="${2:?usage: plan-guard.sh <head-branch-name> <head-sha> [base-ref]}"
base_ref="${3:-origin/v2}"

# Print a GitHub Actions error annotation when running in Actions.
error() {
  if [[ -n "${GITHUB_ACTIONS:-}" ]]; then
    echo "::error title=Plan guard::$1"
  else
    echo "error: $1" >&2
  fi
}

failed=0
merge_base="$(git merge-base "$base_ref" "$head_sha")"

# 1. Only docs/* branches may change the plan.
docs_changes="$(git diff --name-only "$merge_base" "$head_sha" -- docs/)"
if [[ -n "$docs_changes" && "$head_branch" != docs/* ]]; then
  error "This PR changes docs/, which only Daniele edits (on docs/* branches or directly on v2). Revert these files and propose the plan change through your orchestrator instead: $(echo "$docs_changes" | tr '\n' ' ')"
  failed=1
fi

# 2. The branch must include the latest plan change on the base branch.
latest_plan_commit="$(git log -1 --format=%H "$base_ref" -- docs/)"
if [[ -n "$latest_plan_commit" ]] &&
  ! git merge-base --is-ancestor "$latest_plan_commit" "$head_sha"; then
  error "The plan changed on ${base_ref#origin/} after this branch was created (latest docs/ commit: $(git log -1 --format='%h %s' "$latest_plan_commit")). Rebase onto $base_ref, re-read docs/art-spec.md and docs/expansion-plan.md from $base_ref, update 'Plan read at <sha>' in the PR description, and push again."
  failed=1
fi

if [[ "$failed" -eq 0 ]]; then
  echo "Plan guard passed: the branch includes the latest plan commit ${latest_plan_commit:0:7} and leaves docs/ alone (or is a docs/* branch)."
fi
exit "$failed"
