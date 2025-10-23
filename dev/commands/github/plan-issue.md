---
description: Plan implementation for a GitHub issue
argument-hint: [issue-number]
allowed-tools: Bash(gh *), Bash(git *), SlashCommand, AskUserQuestion
---

# Plan Issue Command

Create an implementation plan for a GitHub issue. This command helps you break down the issue into actionable tasks before starting work.

The command accepts an optional issue number as the argument:
- With number: `/github:plan-issue 123`
- Without number: Will try to detect from branch, or display issues and prompt for selection

Follow these steps:
1. Determine the issue number:
   - If issue number provided as argument, use it
   - If no argument, check if current branch is linked to an issue:
     - Get current branch with `git branch --show-current`
     - Check if branch name contains issue number pattern (e.g., `username/123-description`)
     - Extract issue number from branch name if present
   - If no issue found, use SlashCommand to run `/github:list-issues` to display open issues
   - If still no issue, ask user to select an issue number using AskUserQuestion
2. Fetch the full issue details using `gh issue view <issue-number>`
3. Read and analyze the issue:
   - Title and description
   - Acceptance criteria
   - Any additional context
   - Related files or components mentioned
4. Create an implementation plan by:
   - Breaking down the work into logical steps
   - Identifying files that need to be created or modified
   - Noting any dependencies or prerequisites
   - Considering testing requirements
   - Highlighting any potential challenges
5. Present the plan to the user in a clear, organized format
6. Ask the user if they want to proceed with implementation using AskUserQuestion

Important notes:
- Issue number is optional - will auto-detect from branch if possible
- Analyzes the full issue content to create a comprehensive plan
- Plan should be actionable and broken into specific steps
- Consider the acceptance criteria when planning
- If branch is already linked to an issue, that issue takes precedence
