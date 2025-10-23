---
description: Automate the workflow to push changes and create a pull request
argument-hint: [draft|publish]
allowed-tools: SlashCommand, Bash(git *), Bash(gh *), AskUserQuestion
---

# PR Command

Automate the workflow to stage changes, commit them, push to remote, and create a pull request.

The command accepts an optional argument:
- `draft` (default): Creates a draft PR
- `publish`: Creates a published/ready-for-review PR

Follow these steps:
1. Check the current branch with `git branch --show-current`
2. If on main or master branches:
   - First, pull the latest changes from origin with `git pull` to ensure the base branch is up to date
   - Then run the `/dev:git:checkout-new` command to create and checkout a new branch
   - If the user cancels or the command fails: abort the process
3. If on a feature branch:
   - Get the default branch name with `git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@'`
   - Fetch and update the base branch with `git fetch origin <base-branch>:<base-branch>` to ensure it's up to date
4. Run the `/dev:git:commit push` command to stage, commit, and push changes
5. Create a PR using `gh pr create` with:
   - A clear title
   - Add `--draft` flag if the argument is `draft` or not provided (default behavior)
   - A body following the template in `${CLAUDE_PLUGIN_ROOT}/templates/pr_template.md` with:
     - ## Description section (with optional issue links on first line, followed by brief description)
     - ## Changes section (using circle bullets •)
6. Display the PR URL to the user

Important notes:
- If on main/master, creates a new branch first using `/git:checkout-new` before committing
- Use a HEREDOC for PR body to ensure proper formatting
