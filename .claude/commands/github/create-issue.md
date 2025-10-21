---
description: Create a GitHub issue with title and description
argument-hint: "issue description"
allowed-tools: Bash(gh *), Read, AskUserQuestion
---

# Issue Command

Create a GitHub issue with a well-formatted title and description based on the issue template.

The command accepts a description of the issue as the argument (e.g., "create a new login button").

Follow these steps:
1. Read the issue template from `.claude/templates/issue_template.md`
2. Analyze the user's description and determine:
   - Issue type (bug, enhancement, task, documentation)
   - Draft a clear, concise title
   - Fill in the template with available information
3. If there's not enough information to fill in the template properly, ask the user for:
   - Missing details about the issue
   - Expected behavior vs current behavior (for bugs)
   - Proposed solution or requirements (for enhancements)
   - Acceptance criteria
4. Format the complete issue body using the template structure
5. **Show the user a preview** of the issue that will be created:
   - Display the title
   - Display the full body
   - Show which labels will be applied
6. **Ask the user to confirm** before creating the issue
7. If confirmed, create the issue using `gh issue create` with:
   - `-t` for the issue title
   - `-b` for the issue description (use HEREDOC for proper formatting)
   - `-l` to add the type label (bug, enhancement, task, documentation)
   - Optionally: `-a` to assign (supports @me for self-assign)
   - Optionally: `-m` to add to a milestone
   - Optionally: `-p` to add to a project
8. Display the issue URL to the user

Important notes:
- Use a HEREDOC for issue body to ensure proper formatting
- Always show a preview and get confirmation before creating
- Automatically determine and apply the appropriate type label
- Keep the description clear and actionable
