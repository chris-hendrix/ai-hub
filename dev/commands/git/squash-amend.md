---
description: Squash all commits and amend with current changes
allowed-tools: Bash(git *), SlashCommand, AskUserQuestion
---

# Squash Amend Command

Squash all commits on the current branch into one, then amend that commit with any current changes.

Follow these steps:
1. Use SlashCommand to run `/dev:git:squash` to squash all commits
2. Check if there are any current changes with `git status --porcelain`
3. If there are changes:
   - Show the changes with `git diff`
   - Stage all changes with `git add -A`
   - Show the full diff from base branch: `git diff origin/<default-branch>`
   - Analyze all changes (squashed + new) to generate an updated commit message
   - Amend the commit with the new message using `git commit --amend -m`
4. If no changes, inform user the squash is complete
5. Ask the user if they want to force push using AskUserQuestion
6. If confirmed, force push with `git push --force-with-lease`

Important notes:
- Uses `/dev:git:squash` to handle the initial squashing
- Auto-generates commit message based on the complete diff
- Amends the squashed commit with any uncommitted changes
- Use `--force-with-lease` for safer force pushing
- Use a HEREDOC for commit messages to ensure proper formatting
