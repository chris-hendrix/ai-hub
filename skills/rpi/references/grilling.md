# Grilling Plans and Designs

Interview the user relentlessly about a plan or design until you are highly confident no consequential question remains unanswered in the decision tree.

## Purpose

Use `rpi grill` when:
- The user wants to stress-test a plan or design
- Alignment is critical — misunderstanding could lead to wasted implementation effort
- The plan is complex with many interconnected decisions
- The user says "grill me", "challenge my thinking", "poke holes in this", "play devil's advocate", "review my approach", "what am I missing", "pressure test", "tell me why this won't work"
- The user explains an idea and asks "does this make sense?" — treat this as a signal to grill

## Relationship to Planning

`rpi plan` includes a lightweight alignment gate (the 90% confidence check in [planning](./planning.md)). Use `rpi grill` when that lighter pass isn't enough — when the plan warrants exhaustive decision-tree coverage before writing any code.

## Methodology

### Decision Tree Walking

Walk down each branch of the design tree, resolving dependencies between decisions one-by-one. The test: you could predict the user's answer to every meaningful "why" and "how" about the plan without guessing. If you'd have to fill in a blank or assume, you haven't grilled enough yet.

### One Question at a Time

Never ask multiple questions in a single message. Each question should be resolved before moving to the next. This ensures the user isn't overwhelmed and each branch gets proper attention.

### Tool Selection

- **Question tool** — Use for branching/decision-point questions where you can offer concrete options. The question tool presents mutually exclusive choices that the user can select from.
- **Plain text** — Use for open-ended exploration that requires a free-form response.
- **Codebase exploration** — If a question can be answered by reading the codebase, read the codebase instead of asking. Don't ask about things you can discover yourself.

### For Each Question

Provide your recommended answer or position. Don't just ask — offer your own thinking so the user can react to it. This makes the conversation more efficient than open-ended interrogation.

## Question Categories

### Requirements Clarity
- What exactly does [ambiguous term] mean?
- What happens when [edge case]?
- What are the success/failure states?
- Who are the users and what do they need?

### Technical Decisions
- Should this use [pattern A] or [pattern B]?
- Where should [component] live in the codebase?
- What existing code should this integrate with?
- What are the performance/resource implications?

### Scope Boundaries
- Is [feature] in or out of scope?
- What's the MVP vs nice-to-have?
- What can be deferred to a follow-up?
- What's the minimum that makes this useful?

### Testing & Verification
- For each requirement, what test would prove it works?
- What are the unit test boundaries?
- What manual verification is needed that can't be automated?
- What could silently break?

### Risks & Edge Cases
- What happens if [dependency] fails?
- What are the concurrency/race conditions?
- How does this degrade under load?
- What are the security implications?

## Exit Criteria

Stop grilling when ALL of:
1. Every branch of the decision tree has been explicitly resolved
2. You could explain the plan back and the user would say "yes, exactly"
3. You can predict the user's answer to any "why" or "how" question without guessing
4. No consequential question remains unasked

## Example Flow

```
User: "rpi grill my caching strategy for the API"

Agent: Let me start at the top. What problem is caching solving here — 
read latency, database load, cost, or all three? And what's your current 
pain threshold?

[User answers]

Agent: Given that, are you thinking application-level cache (Redis), 
CDN edge cache, database query cache, or a combination? For a read-heavy 
API with sub-100ms requirements, I'd lean toward Redis with CDN for static 
resources — does that match your thinking?

[Continue walking each branch...]
```
