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
   - Run `git status` and `git diff` to see all changes
   - Analyze the changes to generate a short description (3-4 words, lowercase kebab-case)
   - Get the git user from `git config user.name`
   - Generate a branch name in the format: `<username>/<short-description>`
     - Convert username to lowercase and remove all spaces
     - Example: `johndoe/add-login-button`
   - Ask the user to confirm the branch name using AskUserQuestion
   - If confirmed: Create and checkout the new branch with `git checkout -b "<branch-name>"`
   - If not confirmed or user cancels: abort the process
3. Run the `/git/commit push` command to stage, commit, and push changes
4. Create a PR using `gh pr create` with:
   - A clear title
   - Add `--draft` flag if the argument is `draft` or not provided (default behavior)
   - A body following the template in `.claude/templates/pr_template.md` with:
     - ## Description section (with optional issue links on first line, followed by brief description)
     - ## Changes section (using circle bullets •)
5. Display the PR URL to the user

Important notes:
- If on main/master, creates a new branch first before committing
- Branch name is generated from changes and requires user confirmation
- Use a HEREDOC for PR body to ensure proper formatting
