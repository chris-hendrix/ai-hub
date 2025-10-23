# Instructions for Claude Code

## Command Improvement Policy

When executing commands in this plugin, you should proactively identify and fix common errors or edge cases.

### When to Update Commands

If you encounter any of the following situations while running a command, **update the command file** to handle it better:

1. **Missing edge case handling**
   - Example: PR is in draft status when trying to merge
   - Example: Branch already exists when trying to create it
   - Example: No commits to squash

2. **Insufficient error messages**
   - Add clear, actionable error messages
   - Explain why the operation failed and what the user should do

3. **Missing confirmation steps**
   - Operations that should ask for user confirmation but don't
   - Destructive operations without warnings

4. **Incomplete validations**
   - Missing checks for required conditions
   - Not verifying preconditions before proceeding

5. **Better user experience opportunities**
   - Adding helpful context or suggestions
   - Providing multiple resolution options
   - Showing relevant status information

### How to Update Commands

When you identify an improvement:

1. **Read the command file** to understand its current implementation
2. **Update the command** with the fix or improvement
3. **Inform the user** what was changed and why
4. **Continue executing** with the improved command logic

### Example Scenarios

**Scenario: PR is draft when merging**
- Update `/dev:github:pr:merge` to check if PR is draft
- If draft, inform user and offer to mark as ready before merging
- Add this check before attempting to merge

**Scenario: No changes to commit**
- Update `/dev:git:commit` to detect if there are no changes
- Inform user there's nothing to commit
- Exit gracefully instead of erroring

**Scenario: Branch already exists**
- Update `/dev:git:checkout-new` to detect existing branch
- Offer to checkout the existing branch or choose a different name

### Guidelines

- **Be proactive**: Don't just report errors, fix them
- **Be thoughtful**: Only make changes that genuinely improve the command
- **Be clear**: Explain what you changed and why
- **Be consistent**: Follow the existing command structure and style
- **Test your logic**: Make sure the fix actually works for the scenario

This approach ensures the plugin continuously improves based on real-world usage.
