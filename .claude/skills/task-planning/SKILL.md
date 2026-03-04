---
name: task-planning
description: "Atomic task decomposition, dependency mapping, and wave-based execution planning. Use when breaking down features into implementable tasks."
---

# Task Planning

## Critical Rules

- **Atomic tasks** — each task must be completable in one session by one agent.
- **Clear deliverables** — every task must define what "done" looks like.
- **Dependency-first** — map dependencies before assigning order.
- **Wave execution** — group independent tasks into parallel waves.
- **Verify completeness** — every requirement from the brief must map to at least one task.

## Decomposition Process

### Step 1 — Extract Requirements
From the feature brief, list every requirement as a bullet point. Include functional requirements, non-functional requirements (performance, security, accessibility), and technical constraints.

### Step 2 — Break into Atomic Tasks
Each task must:
- Be completable by a single agent
- Have a clear input and output
- Take no more than one focused session
- Be testable independently

### Step 3 — Map Dependencies
For each task, identify:
- **Blocks**: tasks that cannot start until this one completes
- **Blocked by**: tasks that must complete before this one starts
- **Independent**: tasks with no dependency relationship

### Step 4 — Organize into Waves
Group independent tasks into waves for parallel execution:

```
Wave 1 (parallel): [schema design] [UI wireframe] [API contract]
Wave 2 (parallel): [backend implementation] [frontend components]
Wave 3 (sequential): [integration] → [testing] → [review]
```

## Task Format

```markdown
### Task: [Short descriptive title]

- **Agent**: [which agent handles this]
- **Blocked by**: [task IDs or "none"]
- **Deliverable**: [what file(s) or artifact this produces]
- **Acceptance criteria**:
  - [ ] [Criterion 1]
  - [ ] [Criterion 2]
- **Context**: [any extra info the agent needs]
```

## Wave Planning

| Wave | Purpose | Parallelism |
|------|---------|-------------|
| **Wave 0** | Schema, contracts, interfaces | High — no dependencies |
| **Wave 1** | Core implementation (backend + frontend) | Medium — depends on contracts |
| **Wave 2** | Integration, edge cases | Low — depends on core |
| **Wave 3** | Testing, review, polish | Sequential — depends on integration |

## Verification Checklist

Before finalizing the plan:

- [ ] Every requirement from the brief maps to at least one task
- [ ] Every task has a clear deliverable and acceptance criteria
- [ ] No circular dependencies exist
- [ ] Wave assignments reflect actual dependency constraints
- [ ] Each task is assigned to the correct agent based on its domain
- [ ] Critical path is identified (longest chain of dependent tasks)

## Do

- Start with the end state and work backwards
- Identify the critical path early — it determines total timeline
- Keep tasks small enough that failure is cheap to recover from
- Include explicit "integration" tasks where multiple agents' work meets
- Add review/test tasks after each wave, not just at the end

## Don't

- Don't create tasks that span multiple domains (split them)
- Don't forget non-functional tasks (performance, security, accessibility)
- Don't plan more than 3-4 waves deep — replanning will be needed
- Don't skip the dependency check — it catches impossible orderings
- Don't assign tasks to agents outside their skill set

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| **Monolith task** | "Build the feature" as one task | Decompose until each task is < 1 session |
| **Missing integration** | Tasks done independently never connected | Add explicit integration tasks between waves |
| **Over-planning** | Planning 20 waves ahead | Plan 3-4 waves, then replan based on results |
| **Implicit dependency** | Task assumes another is done without declaring it | Always declare blocked-by explicitly |
| **Agent mismatch** | Frontend task assigned to database agent | Match task domain to agent specialization |
