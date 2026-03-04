---
name: brainstorming
description: "Socratic questioning, assumption identification, and brief refinement. Use when starting a new feature, exploring requirements, or refining a project brief."
---

# Brainstorming

## Critical Rules

- **Never jump to solutions** — explore the problem space first.
- **Socratic questioning** — ask "why" at least 3 times before proposing anything.
- **Surface hidden assumptions** — make implicit constraints explicit.
- **Diverge then converge** — generate options broadly, then narrow down.
- **Document everything** — capture decisions, rejected alternatives, and rationale.

## Socratic Questioning Framework

Use progressive questioning to refine requirements:

### Level 1 — Clarify the Goal
- What problem are we solving?
- Who is the primary user?
- What does success look like?
- What is the deadline or timeline constraint?

### Level 2 — Challenge Assumptions
- Why do we believe this is the right approach?
- What are we assuming about the user's behavior?
- What happens if our assumption is wrong?
- Is there existing data to validate this?

### Level 3 — Explore Alternatives
- What other solutions could achieve the same goal?
- What is the simplest version of this feature?
- What would we build if we had half the time?
- What would a competitor do differently?

### Level 4 — Define Boundaries
- What is explicitly out of scope?
- What are the non-negotiable requirements?
- What are the technical constraints?
- What are the dependencies on other teams or systems?

## Brief Template

After questioning, produce a structured brief:

```markdown
## Feature Brief: [Feature Name]

### Problem Statement
[1-2 sentences describing the user problem]

### Target User
[Who benefits from this feature]

### Success Criteria
- [ ] [Measurable outcome 1]
- [ ] [Measurable outcome 2]

### Proposed Solution
[High-level description of the approach]

### Assumptions
- [Assumption 1] — validated / to validate
- [Assumption 2] — validated / to validate

### Out of Scope
- [What we explicitly won't do]

### Open Questions
- [Unresolved question 1]
- [Unresolved question 2]

### Rejected Alternatives
- [Alternative 1]: rejected because [reason]
```

## Do

- Start every feature discussion with "What problem are we solving?"
- List at least 2 alternative approaches before choosing one
- Capture the "why" behind every decision for future reference
- Involve different perspectives (user, developer, business)
- Time-box brainstorming sessions (15-30 min max)

## Don't

- Don't start coding before the brief is validated
- Don't dismiss ideas during divergent thinking
- Don't let one voice dominate the discussion
- Don't skip the "out of scope" section — it prevents scope creep
- Don't confuse brainstorming with planning — stay at the "what" level, not "how"

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| **Solution-first** | Jumping to implementation before understanding the problem | Start with problem statement, ask "why" 3 times |
| **Scope creep** | Adding requirements during brainstorming | Separate "must have" from "nice to have" immediately |
| **Analysis paralysis** | Exploring forever without deciding | Time-box and force a decision at the end |
| **Groupthink** | Everyone agrees too quickly | Assign a devil's advocate role |
| **Vague brief** | Brief without measurable success criteria | Every brief needs at least 2 testable success criteria |
