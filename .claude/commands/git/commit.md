---
description: Stage changes and commit, with optional push to remote
argument-hint: [push]
allowed-tools: Bash(git *)
---

# Commit Command

Automate the workflow to stage changes and create a commit. Optionally push to remote.

The command accepts an optional argument:
- No argument: Stage and commit only
- `push`: Stage, commit, and push to remote

Follow these steps:
1. Check the current branch - **NEVER run this command on main or master branches**. If on main/master, abort and warn the user to switch branches first.
2. Run `git status` to see all untracked files and changes
3. Run `git diff` to see staged and unstaged changes
4. Run `git log --oneline -5` to understand recent commit history and message style
5. Analyze all changes and draft an appropriate commit message that:
   - Summarizes the nature of changes (new feature, enhancement, bug fix, etc.)
   - Is concise (1-2 sentences) focusing on the "why" rather than "what"
   - Follows the repository's commit message style
6. Stage all relevant files with `git add`
7. Create the commit with an appropriate commit message
8. If the `push` argument was provided, push the branch to remote with `git push -u origin [branch-name]`

Important notes:
- **NEVER commit on main or master branches** - always require a feature branch
- Never commit files that likely contain secrets (.env, credentials.json, etc.)
- Use a HEREDOC for commit messages to ensure proper formatting
- Only commit changes explicitly related to the current work
