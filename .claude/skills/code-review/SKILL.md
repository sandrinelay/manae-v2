---
name: code-review
description: "Structured code review checklist, severity classification, and constructive feedback format. Use when reviewing code changes for quality, security, and correctness."
---

# Code Review

## Critical Rules

- **Read the context first** — understand what the change is trying to do before judging how.
- **Severity matters** — classify every finding so the author knows what to fix first.
- **Be specific** — point to exact lines, suggest exact fixes.
- **Be constructive** — explain why, not just what.
- **Acknowledge good work** — highlight well-written code, not just problems.

## Review Checklist

### Correctness
- [ ] Does the code do what the task requires?
- [ ] Are edge cases handled (null, empty, boundary values)?
- [ ] Are error paths handled gracefully?
- [ ] Is the logic free of off-by-one errors?
- [ ] Are race conditions possible with concurrent access?

### Security
- [ ] Is all user input validated before use?
- [ ] Are auth checks present on protected operations?
- [ ] Are secrets kept out of code and responses?
- [ ] Is output properly escaped/sanitized?
- [ ] Are SQL/NoSQL queries parameterized?

### Performance
- [ ] Are there N+1 query patterns?
- [ ] Are large datasets paginated?
- [ ] Are expensive computations cached or memoized?
- [ ] Are components using Server Components where possible?
- [ ] Are there unnecessary re-renders?

### Maintainability
- [ ] Is the code easy to read and understand?
- [ ] Are names descriptive and consistent?
- [ ] Is complexity justified? Could it be simpler?
- [ ] Are there duplicated patterns that should be extracted?
- [ ] Is TypeScript used correctly (no `any`, precise types)?

### Testing
- [ ] Are new behaviors covered by tests?
- [ ] Do tests cover happy path, edge cases, and error cases?
- [ ] Are tests testing behavior, not implementation?

## Severity Classification

| Severity | Meaning | Action |
|----------|---------|--------|
| **Critical** | Security vulnerability, data loss risk, crash | Must fix before merge |
| **High** | Bug, incorrect behavior, missing validation | Must fix before merge |
| **Medium** | Performance issue, code smell, missing test | Should fix, can negotiate |
| **Low** | Style, naming, minor improvement | Nice to have, author decides |
| **Nit** | Pure style preference | Informational only |

## Feedback Format

For each finding:

```markdown
**[SEVERITY]** file.ts:42 — [Category]

[Description of the issue]

[Why it matters]

Suggestion:
\`\`\`ts
// suggested fix
\`\`\`
```

## Review Summary Template

```markdown
## Review Summary

### Overview
[1-2 sentences on what this change does and overall impression]

### Findings
- **Critical**: [count]
- **High**: [count]
- **Medium**: [count]
- **Low/Nit**: [count]

### Verdict
[APPROVE / REQUEST_CHANGES / NEEDS_DISCUSSION]

### Highlights
- [Something well done worth noting]

### Required Changes
1. [Critical/High finding 1]
2. [Critical/High finding 2]

### Suggestions
1. [Medium/Low finding 1]
2. [Medium/Low finding 2]
```

## Do

- Read the full diff before commenting on individual lines
- Provide a suggested fix, not just a problem description
- Acknowledge improvements and good patterns
- Focus on the most impactful issues first
- Ask questions when intent is unclear instead of assuming

## Don't

- Don't nitpick style when there are real bugs to fix
- Don't rewrite the author's approach unless fundamentally flawed
- Don't leave vague feedback ("this feels wrong")
- Don't block on personal preferences (use "nit" severity)
- Don't review more than 400 lines in one session — split large changes
