/**
 * Worktree status — renders `wt:<name>` into pi's footer status line when the
 * session cwd is a *linked* git worktree (`git worktree add`), and nothing in
 * the main checkout: the exception is the signal, so there is no `wt:main`.
 *
 * Detection is filesystem-only — no `git` spawn, no dependency on pi internals.
 * Walk up to the first `.git`, and when that entry is a file, read its
 * `gitdir:` target and look for a `commondir` file beside it. That pair is
 * exactly what git writes for a linked worktree
 * (`gitdir: …/.git/worktrees/<name>` plus `commondir`), and exactly what a
 * submodule lacks (`gitdir: …/.git/modules/<name>`, no `commondir`), so
 * submodules are never mislabelled. The first `.git` found wins, which also
 * keeps a repo nested inside a worktree from inheriting the worktree label.
 *
 * The name is the basename of the git dir — git's own worktree name, the one
 * `git worktree list` and pi-subagents handoffs use. It can differ from the
 * directory name if the checkout was moved.
 *
 * The segment is muted so the active mode stays the only colored thing on the
 * line, and it is keyed `0wt` because extension statuses sort alphabetically by
 * key — that puts it first, directly under the pwd/branch cell above it.
 *
 * Refresh is cheap (a few stats/reads) and runs on session_start, turn_start,
 * and bash tool ends — a shell command is what switches a branch or adds a
 * worktree. 
 *
 * session_start always writes (the segment or an explicit undefined), so the
 * footer is correct even if statuses survived a session switch; other refreshes
 * only write when the rendered text changes.
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, isAbsolute, join, resolve } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

/** Sort key: extension statuses render in alphabetical key order. */
const STATUS_KEY = "0wt";

/** Bound on the walk to the repo root; real checkouts are nowhere near this deep. */
const MAX_LEVELS = 40;

/** The name of the linked worktree containing `cwd`, or undefined for a main
 * checkout, a submodule, a bare repo, a nested repo, or no repo at all. */
function findLinkedWorktree(cwd: string): string | undefined {
	let dir = resolve(cwd);
	for (let level = 0; level < MAX_LEVELS; level++) {
		const dotGit = join(dir, ".git");
		if (existsSync(dotGit)) {
			// A directory is a normal checkout or the main worktree: not linked.
			if (statSync(dotGit).isDirectory()) return undefined;
			let gitDir: string;
			try {
				const content = readFileSync(dotGit, "utf-8").trim();
				if (!content.startsWith("gitdir:")) return undefined;
				const target = content.slice("gitdir:".length).trim();
				gitDir = isAbsolute(target) ? target : resolve(dir, target);
			} catch {
				return undefined;
			}
			// `commondir` is written only for linked worktrees; submodules have none.
			if (!existsSync(join(gitDir, "commondir"))) return undefined;
			return basename(gitDir);
		}
		const parent = dirname(dir);
		if (parent === dir) return undefined;
		dir = parent;
	}
	return undefined;
}

export default function (pi: ExtensionAPI) {
	let rendered: string | undefined;

	/** Assert the footer segment for `ctx.cwd`; `force` skips the change check. */
	function refresh(ctx: ExtensionContext, force = false) {
		const worktree = findLinkedWorktree(ctx.cwd);
		const text = worktree ? ctx.ui.theme.fg("muted", `wt:${worktree}`) : undefined;
		if (!force && text === rendered) return;
		rendered = text;
		ctx.ui.setStatus(STATUS_KEY, text);
	}

	// The new session owns its footer: say what it is, including "nothing".
	pi.on("session_start", async (_event, ctx) => refresh(ctx, true));
	pi.on("turn_start", async (_event, ctx) => refresh(ctx));
	pi.on("tool_execution_end", async (event, ctx) => {
		if (event.toolName === "bash") refresh(ctx);
	});

	// Drop the cache so the next session re-asserts rather than trusting it.
	pi.on("session_shutdown", async () => {
		rendered = undefined;
	});
}
