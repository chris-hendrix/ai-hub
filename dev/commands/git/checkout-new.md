---
description: Create and checkout a branch linked to a GitHub issue
argument-hint: [branch-name]
allowed-tools: Bash(git *), AskUserQuestion
---

# Checkout New Command

Create and checkout a new branch, generating a branch name from current changes if needed.

The command accepts an optional argument:
- `branch-name`: A specific branch name to use (optional)

Follow these steps:
1. Check the current branch with `git branch --show-current`
2. If already on a branch that is NOT main or master:
   - Inform the user they're already on a feature branch
   - Ask if they want to create a new branch anyway
   - If no, abort the process
3. If branch-name argument is provided:
   - Use that as the branch name
   - Create and checkout the new branch with `git checkout -b "<branch-name>"`
4. If no branch-name argument is provided:
   - Run `git status` and `git diff` to see all changes
   - Analyze the changes to generate a short description (3-4 words, lowercase kebab-case)
   - Get the git user from `git config user.name`
   - Generate a branch name in the format: `<username>/<short-description>`
     - Convert username to lowercase and remove all spaces
     - Example: `johndoe/add-login-button`
   - Ask the user to confirm the branch name using AskUserQuestion
   - If confirmed: Create and checkout the new branch with `git checkout -b "<branch-name>"`
   - If not confirmed or user cancels: abort the process
5. Display confirmation that the new branch was created and checked out

Important notes:
- This command is useful when starting work on a new feature or fix
- Branch names follow the convention: `<username>/<short-description>`
- If changes exist, they stay uncommitted on the new branch
- The command will warn if you're already on a feature branch
