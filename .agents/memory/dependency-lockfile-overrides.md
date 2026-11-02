---
name: Dependency lockfile overrides
description: npm and pnpm need separate override declarations when maintaining both lockfiles.
---

When retaining both npm and pnpm lockfiles, declare necessary transitive dependency overrides for each package manager before regenerating locks.

**Why:** `pnpm import` does not apply npm's `overrides`, so importing an otherwise safe npm lockfile can resolve vulnerable transitive packages again.

**How to apply:** Keep npm `overrides` and pnpm `pnpm.overrides` equivalent, then scan all retained lockfiles, including nested artifacts.
