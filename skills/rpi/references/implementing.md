# Implement

Execute a plan's checklist (`rpi implement all <plan>` / `implement phase N <plan>`).

Loop, per task:

1. **Pop** — `rpi next <plan>` to get the next task with its RED/GREEN/CHECK block.
2. **Implement** — hand a cheap subagent the task block plus the plan document (it needs the Architecture, not just the task). It executes in the shape the task defines (RED present → test-first) and must run CHECK and report the result.
3. **Verify & mark** — confirm CHECK passed yourself, then `rpi done <plan> <task-id>`. The orchestrator flips the checkbox, never the subagent — state advances only on verified results, not self-reports.

On failure: retry once with the failure output as context; if it still fails, stop and surface to the user — never mark complete or work around the plan.

Stay in the orchestrator role — don't implement tasks yourself. Phase boundaries are the natural points to check in with the user.
