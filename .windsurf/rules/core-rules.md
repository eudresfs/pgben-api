---
trigger: always_on
description: Core Rules
---

# Core Rules

<Rules>
  <Rule id="1" description="Memory-First Development">
    <SubRule id="1a">Begin every session by loading all three memory layers.</SubRule>
    <SubRule id="1b">Verify memory consistency before starting any task.</SubRule>
    <SubRule id="1c">Update appropriate memory layers after completing any task.</SubRule>
  </Rule>

  <Rule id="2" description="Complete Implementation">
    <SubRule id="2a">Never leave placeholder comments or incomplete implementations.</SubRule>
    <SubRule id="2b">Deliver fully functional, tested code for every task.</SubRule>
    <SubRule id="2c">Escalate unresolvable issues to the user with complete context.</SubRule>
  </Rule>

  <Rule id="3" description="Read Before Edit">
    <SubRule id="3a">Always read files before modifying them.</SubRule>
    <SubRule id="3b">Document file contents in the task log if not already in Memory Bank.</SubRule>
    <SubRule id="3c">Verify understanding of file purpose and structure before changes.</SubRule>
  </Rule>

  <Rule id="4" description="State Preservation">
    <SubRule id="4a">Save project state to Memory Bank after every completed task.</SubRule>
    <SubRule id="4b">Update memory-index.md with new or modified files.</SubRule>
    <SubRule id="4c">Generate checksums for core memory files to detect inconsistencies.</SubRule>
  </Rule>

  <Rule id="5" description="Continuous Improvement">
    <SubRule id="5a">Evaluate performance after each task using the scoring system.</SubRule>
    <SubRule id="5b">Generate strict criteria during planning phase to validate high standard project and task completion.</SubRule>
    <SubRule id="5c">Identify and document improvement opportunities.</SubRule>
    <SubRule id="5d">Apply learned patterns to future tasks.</SubRule>
  </Rule>

  <Rule id="6" description="No Implementation Guessing">
    <SubRule id="6a">Never guess implementations - always consult documentation first.</SubRule>
    <SubRule id="6b">Use Cascade's real-time search capability to find accurate implementation details.</SubRule>
    <SubRule id="6c">Document all implementation decisions with references to authoritative sources.</SubRule>
    <SubRule id="6d">When documentation is unclear, use Cascade's search to find accurate implementation details. Never implement based on assumptions.</SubRule>
  </Rule>

  <Rule id="7" description="Dependency Management">
    <SubRule id="7a">Add all dependencies via terminal commands without specifying versions.</SubRule>
    <SubRule id="7b">Let package managers (npm, cargo, pip, etc.) select the correct compatible versions.</SubRule>
    <SubRule id="7c">Document the command used to add each dependency in the task log.</SubRule>
    <SubRule id="7d">Never manually edit version numbers in package files unless specifically instructed.</SubRule>
    <SubRule id="7e">For JavaScript: Use `npm install package-name` without version constraints. [alternative package managers: yarn, pnpm, bun, etc.]</SubRule>
    <SubRule id="7f">For Rust: Use `cargo add crate-name` without version constraints.</SubRule>
    <SubRule id="7g">For Python: Use `pip install package-name` without version constraints. [alternative package managers: poetry, uv, etc.]</SubRule>
  </Rule>

  <Rule id="8" description="Context Management">
    <SubRule id="8a">Monitor context utilization during large codebase analysis.</SubRule>
    <SubRule id="8b">Reload global and workspace rulesets when context reaches 70% capacity.</SubRule>
    <SubRule id="8c">Prioritize retention of critical implementation patterns and decisions.</SubRule>
    <SubRule id="8d">Document context reloads in the task log to maintain continuity. The task log is your Working Memory and key to maintaining continuous learning.</SubRule>
  </Rule>
</Rules>

# Event Handlers

<EventHandlers>
  <Handler event="SessionStart">
    <Action>Check if `.windsurf/` directory structure exists</Action>
    <Action>If structure doesn't exist, scaffold it by creating all required directories</Action>
    <Action>If memory files don't exist, initialize them with available project information</Action>
    <Action>Load all memory layers from `.windsurf/core/`</Action>
    <Action>Verify memory consistency using checksums in memory-index.md</Action>
    <Action>Identify current task context from activeContext.md</Action>
    <Action>Create a memory of this initialization process using the CASCADE GENERATED MEMORY system for automatic reminder via EPHEMERAL MEMORY</Action>
  </Handler>

  <Handler event="TaskStart">
    <Action>Document task objectives in new task log</Action>
    <Action>Develop criteria for successful task completion</Action>
    <Action>Load relevant context from memory</Action>
    <Action>Create implementation plan</Action>
  </Handler>

  <Handler event="ErrorDetected">
    <Action>Document error details in `.windsurf/errors/`</Action>
    <Action>Check memory for similar errors</Action>
    <Action>Apply recovery strategy</Action>
    <Action>Update error patterns</Action>
  </Handler>

  <Handler event="TaskComplete">
    <Action>Document implementation details in task log</Action>
    <Action>Evaluate performance</Action>
    <Action>Update all memory layers</Action>
    <Action>Update activeContext.md with next steps</Action>
  </Handler>

  <Handler event="SessionEnd">
    <Action>Ensure all memory layers are synchronized</Action>
    <Action>Document session summary in activeContext.md</Action>
    <Action>Update checksums in memory-index.md</Action>
  </Handler>
</EventHandlers>