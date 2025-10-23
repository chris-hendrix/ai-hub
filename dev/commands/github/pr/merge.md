---
description: Squash and merge a pull request after confirmation
argument-hint: [pr-number]
allowed-tools: Bash(gh *), AskUserQuestion
---

# Merge PR Command

Squash and merge a pull request. The PR must be mergeable (all checks passed, no conflicts).

The command accepts an optional PR number:
- No argument: Uses the PR associated with the current branch
- `<pr-number>`: Merges the specified PR number

Follow these steps:
1. If no PR number provided:
   - Get the current branch with `git branch --show-current`
   - Get the PR for this branch using `gh pr view --json number,title,mergeable,mergeStateStatus,isDraft`
   - If no PR found, notify user and stop
2. If PR number provided:
   - Get the PR details using `gh pr view <pr-number> --json number,title,mergeable,mergeStateStatus,isDraft`
3. Check if the PR is in draft status:
   - If `isDraft` is true, inform user the PR is still a draft
   - Ask if they want to mark it as ready for review using AskUserQuestion
   - If confirmed, mark as ready with `gh pr ready <pr-number>`
   - If not confirmed, stop the process
4. Check if the PR is mergeable:
   - If the PR cannot be merged, notify user of the reason and stop
   - Common reasons: merge conflicts, failing checks, required reviews missing, etc.
   - Check the `mergeable` field - it should be `MERGEABLE` to proceed
5. Display PR details to the user:
   - PR number and title
   - Mergeable status
   - That it will be squash merged
6. Ask the user to confirm the merge using AskUserQuestion
7. If confirmed, merge using:
   ```
   gh pr merge <pr-number> --squash --delete-branch
   ```
   Note: `--delete-branch` deletes both local and remote branch after merge
8. After successful merge, run the `/dev:git:checkout-default` command to return to the default branch with latest changes
9. Display confirmation that the PR was merged

Important notes:
- Always use `--squash` to squash commits into one
- Always use `--delete-branch` to clean up branches after merge
- The command will stop if the PR is not mergeable
- Must get user confirmation before merging
- Without an argument, uses the PR for the current branch
