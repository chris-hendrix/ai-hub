---
description: Automate the workflow to push changes and create a pull request
argument-hint: [draft|publish]
allowed-tools: SlashCommand, Bash(git *), Bash(gh *)
---

# PR Command

Automate the workflow to stage changes, commit them, push to remote, and create a pull request.

The command accepts an optional argument:
- `draft` (default): Creates a draft PR
- `publish`: Creates a published/ready-for-review PR

Follow these steps:
1. Run the `/git/commit push` command to stage, commit, and push changes
2. Create a PR using `gh pr create` with:
   - A clear title
   - Add `--draft` flag if the argument is `draft` or not provided (default behavior)
   - A body following the template in `.claude/templates/pr_template.md` with:
     - ## Description section (with optional issue links on first line, followed by brief description)
     - ## Changes section (using circle bullets •)
3. Display the PR URL to the user

Important notes:
- Use a HEREDOC for PR body to ensure proper formatting
