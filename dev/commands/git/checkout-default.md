---
description: Checkout default branch and pull latest changes
allowed-tools: Bash(git *)
---

# Checkout Default Command

Checkout the default branch and pull the latest changes.

Follow these steps:
1. Check if there are any uncommitted changes with `git status --porcelain`
2. If there are changes, stash them with `git stash push -u -m "Auto-stash before checkout-default"`
   - The `-u` flag includes untracked files
   - Note that changes were stashed
3. Get the default branch name (usually `main` or `master`):
   - Use `git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@'`
   - This ensures we checkout the correct default branch for the repository
4. Checkout the default branch with `git checkout <branch-name>`
5. Pull the most recent changes with `git pull`
6. If changes were stashed in step 2, apply them with `git stash pop`
   - Handle any merge conflicts if they occur
7. Display confirmation that you're now on the default branch with the latest changes

Important notes:
- This command is typically used after merging a PR or when you need to return to the default branch
- Only stashes if there are uncommitted changes
- Stashing ensures you don't lose any uncommitted work when switching branches
- Always pull after checking out to ensure you have the latest changes
- Stashed changes are automatically reapplied after pulling
