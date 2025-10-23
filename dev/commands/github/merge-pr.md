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
   - Get the PR for this branch using `gh pr view --json number,title,mergeable,mergeStateStatus`
   - If no PR found, notify user and stop
2. If PR number provided:
   - Get the PR details using `gh pr view <pr-number> --json number,title,mergeable,mergeStateStatus`
3. Check if the PR is mergeable:
   - If the PR cannot be merged, notify user of the reason and stop
   - Common reasons: merge conflicts, failing checks, required reviews missing, etc.
   - Check the `mergeable` field - it should be `MERGEABLE` to proceed
4. Display PR details to the user:
   - PR number and title
   - Mergeable status
   - That it will be squash merged
5. Ask the user to confirm the merge using AskUserQuestion
6. If confirmed, merge using:
   ```
   gh pr merge <pr-number> --squash --delete-branch
   ```
   Note: `--delete-branch` deletes both local and remote branch after merge
7. After successful merge:
   - Checkout the main branch with `git checkout main`
   - Pull the most recent changes with `git pull`
8. Display confirmation that the PR was merged

Important notes:
- Always use `--squash` to squash commits into one
- Always use `--delete-branch` to clean up branches after merge
- The command will stop if the PR is not mergeable
- Must get user confirmation before merging
- Without an argument, uses the PR for the current branch
