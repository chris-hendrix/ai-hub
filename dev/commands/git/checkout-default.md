---
description: Checkout default branch and pull latest changes
allowed-tools: Bash(git *)
---

# Checkout Default Command

Checkout the default branch and pull the latest changes.

Follow these steps:
1. Stash any uncommitted changes with `git stash push -u -m "Auto-stash before checkout-default"`
   - The `-u` flag includes untracked files
   - Note whether changes were stashed (git will output "No local changes to save" if nothing to stash)
2. Get the default branch name (usually `main` or `master`):
   - Use `git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@'`
   - This ensures we checkout the correct default branch for the repository
3. Checkout the default branch with `git checkout <branch-name>`
4. Pull the most recent changes with `git pull`
5. If changes were stashed in step 1, apply them with `git stash pop`
   - Handle any merge conflicts if they occur
6. Display confirmation that you're now on the default branch with the latest changes

Important notes:
- This command is typically used after merging a PR or when you need to return to the default branch
- Stashing ensures you don't lose any uncommitted work when switching branches
- Always pull after checking out to ensure you have the latest changes
- Stashed changes are automatically reapplied after pulling
