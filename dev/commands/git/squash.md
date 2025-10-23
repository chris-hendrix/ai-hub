---
description: Squash all commits on current branch into one
allowed-tools: Bash(git *), AskUserQuestion
---

# Squash Command

Squash all commits on the current branch into a single commit with a new message.

Follow these steps:
1. Check the current branch with `git branch --show-current`
2. **NEVER run this command on main or master branches**. If on default branch, abort and warn the user to switch branches first.
3. Get the default branch name with `git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@'`
4. Count commits since branching from default: `git rev-list --count HEAD ^origin/<default-branch>`
5. If count is 0 or 1, inform user there's nothing to squash and abort
6. Inform the user: "Squashing <count> commits on branch <branch-name>"
7. Show the commits that will be squashed:
   - Run `git log --oneline HEAD ^origin/<default-branch>` to display all commits on this branch
8. Ask the user to confirm the squash operation using AskUserQuestion:
   - Ask if they want to proceed with squashing <count> commits
9. If not confirmed, abort the process
10. Show the combined diff of all commits:
    - Run `git diff origin/<default-branch>...HEAD` to show all changes
11. Analyze the commits and changes to draft a new consolidated commit message that:
    - Summarizes the overall purpose of all the changes
    - Focuses on the "why" rather than the "what"
    - Follows the repository's commit message style
12. Perform the squash:
    - Use `git reset --soft origin/<default-branch>` to soft reset to base branch
    - Create new commit with the consolidated message
13. Display confirmation with the new commit hash
14. Ask the user if they want to force push the squashed commit using AskUserQuestion
15. If confirmed, force push with `git push --force-with-lease`

Important notes:
- **NEVER squash on main or master branches** - always require a feature branch
- Use `--force-with-lease` instead of `--force` for safer force pushing
- Soft reset preserves all changes in staging area
- Squashes ALL commits since branching from default branch
- Always confirm with user before squashing
- Use a HEREDOC for commit messages to ensure proper formatting
