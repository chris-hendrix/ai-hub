---
description: Update the PR for the current branch and optionally change draft status
argument-hint: [draft|publish]
allowed-tools: SlashCommand, Bash(git *), Bash(gh *)
---

# Update PR Command

Update the pull request associated with the current branch. Push new commits and optionally mark as draft or ready for review.

The command accepts an optional argument:
- No argument: Just push changes and update the PR
- `draft`: Mark the PR as draft
- `publish`: Mark the PR as ready for review

Follow these steps:
1. Get the current branch with `git branch --show-current`
2. Check if a PR exists for this branch using `gh pr view --json number,title,isDraft`
3. If no PR is found:
   - Notify the user that no PR exists for this branch
   - Stop the process - do not continue
4. Use the SlashCommand tool to run `/git:commit push` to stage, commit, and push changes
5. If an argument was provided:
   - If `draft`: Mark as draft using `gh pr ready --undo <pr-number>`
   - If `publish`: Mark as ready using `gh pr ready <pr-number>`
6. Display the PR URL and status to the user

Important notes:
- The command will stop immediately if there's no PR for the current branch
- Use `gh pr ready` to mark as ready for review
- Use `gh pr ready --undo` to convert back to draft
- The PR description/title is not updated, only commits and draft status
