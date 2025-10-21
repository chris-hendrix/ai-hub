---
description: Create and checkout a branch linked to a GitHub issue
argument-hint: <issue-number>
allowed-tools: Bash(gh *), Bash(git *), Bash(git pull)
---

# Checkout Issue Command

Create a new branch linked to a GitHub issue and check it out. The branch name will include the git user, issue number, and a short description.

The command requires an issue number as the argument (e.g., `/github/checkout-issue 123`).

Follow these steps:
1. Check the current branch with `git branch --show-current`
2. If the current branch is a remote tracking branch (main, master, develop, etc.):
   - Pull the latest changes with `git pull`
3. Check if there are any staged or unstaged changes with `git status --porcelain`
4. If there are changes:
   - Stash them with `git stash`
5. Get the git user from `git config user.name`
6. Fetch the issue details using `gh issue view <issue-number> --json number,title`
7. Generate a branch name in the format: `<username>/<issue-number>-<short-description>`
   - Convert username to lowercase and remove all spaces
   - Create a short description from the issue title (lowercase, kebab-case, max 3-4 words)
   - Example: `johndoe/123-add-login-button`
8. Create and checkout the branch linked to the issue using:
   ```
   gh issue develop <issue-number> --name "<branch-name>" --base <current-branch> --checkout
   ```
   Note: The `--base` flag creates the branch from the current branch instead of the default branch
9. If changes were stashed, pop them back with `git stash pop`
10. Display confirmation with the branch name and issue link

Important notes:
- Always use the git config user.name, not the GitHub username
- Branch is created off the current branch using `--base` flag
- If on a remote tracking branch (main, master, develop), pull latest changes first
- Changes are stashed before creating branch, then popped back to preserve their state
- Keep the description short and descriptive (3-4 words max from the title)
- Use kebab-case for all parts of the branch name
- The command will fail if the issue doesn't exist or if the branch already exists
