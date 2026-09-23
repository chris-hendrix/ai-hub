/**
 * handoff — one command from one session to the next.
 *
 *   /handoff [focus] [--dir <path>] [--here|--current] [--root]
 *
 *   1. gathers workspace facts (branch, HEAD, status, recent commits) and asks
 *      this session's agent to write a handoff for the agent that replaces it.
 *      The facts ride along in the instruction, so the turn is a single model
 *      call with no tool use. Thinking drops to "minimal" for that turn and is
 *      restored afterwards.
 *   2. persists the result to <dir>/<date>-<HHMMSS>-<slug>.md (default dir
 *      `.handoffs`) with frontmatter carrying the chain of session ids.
 *   3. starts a fresh session and injects the handoff as a plain user message,
 *      which the agent picks up automatically.
 *
 * Storage defaults to `.handoffs/` in the main worktree, so sessions running
 * in linked worktrees still share one chain. Override in settings.json:
 *
 *   { "handoff": { "dir": ".rpi/handoffs", "worktrees": "root" } }
 *
 * - `dir`: handoff directory, default ".handoffs". Relative paths
 *   resolve against the storage root; absolute paths are used as-is.
 * - `worktrees`: "root" (default) stores in the main worktree;
 *   "current" stores in the worktree the session runs in.
 *
 * Precedence for the directory: --dir flag > PI_HANDOFF_DIR env >
 * project settings > global settings > ".handoffs".
 *
 * Starting the fresh session goes through ctx.newSession(), which performs the
 * same reload/rebind cycle as /reload (session_shutdown → extensions, skills,
 * prompts, themes and context files reloaded → session_start) but with an empty
 * conversation. That is the whole point: fresh context, handoff injected.
 *
 * The handoff is authored by the live agent on purpose. At the end of a long
 * session its context is already compacted, so it can summarize what happened
 * from memory in one shot — no transcript re-serialization, no tool loops.
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import type {
	ExtensionAPI,
	ExtensionCommandContext,
	SessionEntry,
} from "@earendil-works/pi-coding-agent";
import { CONFIG_DIR_NAME, getAgentDir } from "@earendil-works/pi-coding-agent";

const DEFAULT_DIR = ".handoffs";

interface Armed {
	/** Command context — the only context that can start a session. */
	cmdCtx: ExtensionCommandContext;
	/** Session file being left, recorded as the new session's parent. */
	parentSession: string | undefined;
	/** This session's id, appended to the handoff's session chain. */
	sessionId: string;
	/** Where the handoff file is written (main or current worktree root). */
	storageRoot: string;
	/** Worktree the session runs in (for display paths). */
	worktreeRoot: string;
	/** Handoff directory: relative to storageRoot, or absolute. */
	dirName: string;
	/** Thinking level to restore after the handoff turn. */
	prevThinking: Parameters<ExtensionAPI["setThinkingLevel"]>[0];
	/** Set once the handoff turn actually starts, so a late settle cannot act. */
	started: boolean;
	/** When the handoff was armed — a turn that never starts leaves stale state. */
	armedAt: number;
}

let armed: Armed | undefined;

const pad = (n: number): string => String(n).padStart(2, "0");

function kebab(s: string): string {
	return s
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-|-$/g, "");
}

/** Title for the filename and frontmatter, taken from the document's H1. */
function topicFrom(markdown: string): string {
	const heading = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "";
	const stripped = heading.replace(/^handoff\s*[—–:-]\s*/i, "").trim();
	return stripped || "session handoff";
}

/** Text of the last assistant message on the branch, if it has any. */
function lastAssistantText(branch: SessionEntry[]): string | undefined {
	for (let i = branch.length - 1; i >= 0; i--) {
		const entry = branch[i];
		if (entry.type !== "message") continue;
		const message = entry.message as { role?: string; content?: unknown };
		if (message.role !== "assistant") continue;
		const content = message.content;
		if (typeof content === "string") return content.trim() || undefined;
		if (!Array.isArray(content)) return undefined;
		const text = content
			.filter(
				(part): part is { type: "text"; text: string } =>
					!!part &&
					typeof part === "object" &&
					(part as { type?: string }).type === "text" &&
					typeof (part as { text?: unknown }).text === "string",
			)
			.map((part) => part.text)
			.join("\n")
			.trim();
		return text || undefined;
	}
	return undefined;
}

function looksLikeHandoff(text: string): boolean {
	return /^#\s+/m.test(text) && /^##\s+\d/m.test(text);
}

interface HandoffConfig {
	dir?: string;
	worktrees?: "root" | "current";
}

function readJsonFile(path: string): Record<string, unknown> {
	try {
		const parsed: unknown = JSON.parse(readFileSync(path, "utf-8"));
		return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
	} catch {
		return {};
	}
}

/** Global settings merged with project settings; project wins. */
function readHandoffConfig(cwd: string): HandoffConfig {
	const global = readJsonFile(join(getAgentDir(), "settings.json")).handoff;
	const project = readJsonFile(join(cwd, CONFIG_DIR_NAME, "settings.json")).handoff;
	const out: HandoffConfig = {};
	for (const source of [global, project]) {
		if (!source || typeof source !== "object") continue;
		const { dir, worktrees } = source as Record<string, unknown>;
		if (typeof dir === "string" && dir.trim()) out.dir = dir.trim();
		if (worktrees === "root" || worktrees === "current") out.worktrees = worktrees;
	}
	return out;
}

interface Flags {
	dirFlag?: string;
	placement?: "root" | "current";
	focus: string;
}

const stripQuotes = (s: string): string => s.replace(/^["']|["']$/g, "");

/**
 * Pull --dir <path> / --dir=<path>, --here / --current, --root out of the
 * command args; whatever remains is the focus text.
 */
function parseFlags(args: string): Flags {
	let rest = args;
	let dirFlag: string | undefined;
	const dirEq = rest.match(/--dir=("[^"]*"|'[^']*'|\S+)/);
	if (dirEq?.[1]) {
		dirFlag = stripQuotes(dirEq[1]);
		rest = rest.replace(dirEq[0], " ");
	} else {
		const dirSep = rest.match(/--dir\s+("[^"]*"|'[^']*'|\S+)/);
		if (dirSep?.[1]) {
			dirFlag = stripQuotes(dirSep[1]);
			rest = rest.replace(dirSep[0], " ");
		}
	}
	let placement: "root" | "current" | undefined;
	if (/\B--here\b|\B--current\b/.test(rest)) placement = "current";
	if (/\B--root\b/.test(rest)) placement = "root";
	rest = rest
		.replace(/\B--here\b/g, " ")
		.replace(/\B--current\b/g, " ")
		.replace(/\B--root\b/g, " ");
	return { dirFlag, placement, focus: rest.trim().replace(/\s+/g, " ") };
}

function resolveDirName(flag: string | undefined, config: HandoffConfig): string {
	const raw = flag || process.env.PI_HANDOFF_DIR || config.dir || DEFAULT_DIR;
	const clean = raw.trim().replace(/\/+$/g, "") || DEFAULT_DIR;
	return clean;
}

async function resolveRoots(
	pi: ExtensionAPI,
	cwd: string,
): Promise<{ worktreeRoot: string; mainRoot: string; inGit: boolean }> {
	let worktreeRoot: string;
	try {
		const top = await pi.exec("git", ["rev-parse", "--show-toplevel"], { cwd });
		const out = (top.stdout ?? "").trim();
		if (top.code !== 0 || !out) return { worktreeRoot: cwd, mainRoot: cwd, inGit: false };
		worktreeRoot = out;
	} catch {
		return { worktreeRoot: cwd, mainRoot: cwd, inGit: false };
	}

	// `worktree list` prints the main worktree first with absolute paths.
	try {
		const list = await pi.exec("git", ["worktree", "list", "--porcelain"], {
			cwd: worktreeRoot,
		});
		if (list.code === 0) {
			const first = list.stdout
				.split("\n")
				.find((line) => line.startsWith("worktree "));
			const main = first?.slice("worktree ".length).trim();
			if (main) return { worktreeRoot, mainRoot: main, inGit: true };
		}
	} catch {
		// fall through to the common-dir heuristic
	}

	// Linked worktrees share the main worktree's git dir:
	// <main>/.git/worktrees/<name> vs <root>/.git for the main worktree.
	try {
		const common = await pi.exec("git", ["rev-parse", "--git-common-dir"], {
			cwd: worktreeRoot,
		});
		const raw = (common.stdout ?? "").trim();
		if (common.code === 0 && raw) {
			const abs = isAbsolute(raw) ? raw : join(worktreeRoot, raw);
			const linked = abs.match(/^(.*)\/\.git\/worktrees\/[^/]+$/);
			if (linked?.[1]) return { worktreeRoot, mainRoot: linked[1], inGit: true };
		}
	} catch {
		// ignore — storage falls back to the current worktree
	}
	return { worktreeRoot, mainRoot: worktreeRoot, inGit: true };
}

/** Cap on stored session ids: the chain is re-injected into every fresh
 * session, so it must not grow without bound. Each document still links to
 * its predecessor, so trimming the oldest links loses no continuity. */
const MAX_SESSION_CHAIN = 20;

/**
 * Chain of session ids: the newest handoff's chain, with this session appended,
 * so the documents link together across sessions.
 */
function chainSessions(dir: string, sessionId: string): string[] {
	let newest: string | undefined;
	try {
		const files = readdirSync(dir).filter((file) => file.endsWith(".md"));
		// mtime first: same-second "slug-2.md" sorts before "slug.md"
		// lexically ("-" < "."), so a name sort alone can pick the older link.
		newest = files
			.map((file) => {
				try {
					return { file, mtime: statSync(join(dir, file)).mtimeMs };
				} catch {
					return { file, mtime: 0 };
				}
			})
			.sort((a, b) => a.mtime - b.mtime || (a.file < b.file ? -1 : a.file > b.file ? 1 : 0))
			.at(-1)?.file;
	} catch {
		// no handoffs yet
	}

	const chain: string[] = [];
	if (newest) {
		try {
			const raw = readFileSync(join(dir, newest), "utf-8");
			const end = raw.indexOf("\n---", 3);
			const lines = (end === -1 ? raw : raw.slice(0, end)).split("\n");
			const start = lines.findIndex((line) => /^sessions:\s*$/.test(line));
			if (start !== -1) {
				for (let i = start + 1; i < lines.length; i++) {
					const item = lines[i]?.match(/^\s*-\s+(.+?)\s*$/);
					if (!item) break;
					chain.push(item[1]);
				}
			}
		} catch {
			// unreadable newest handoff — start a fresh chain
		}
	}
	if (!chain.includes(sessionId)) chain.push(sessionId);
	while (chain.length > MAX_SESSION_CHAIN) chain.shift();
	return chain;
}

function persistHandoff(
	storageRoot: string,
	dirName: string,
	sessionId: string,
	markdown: string,
	preferRelative: boolean,
): { path: string; displayPath: string; dir: string } {
	const dir = resolve(storageRoot, dirName);
	mkdirSync(dir, { recursive: true });

	const body = markdown.trim();
	const topic = topicFrom(body);
	const slug = kebab(topic) || "session-handoff";
	const now = new Date();
	const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
	const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
	const sessions = chainSessions(dir, sessionId);

	const frontmatter = [
		"---",
		"type: handoff",
		`date: ${date}`,
		`topic: ${topic}`,
		"status: handed-off",
		"sessions:",
		...sessions.map((id) => `- ${id}`),
		"---",
		"",
	].join("\n");

	let path = join(dir, `${date}-${time}-${slug}.md`);
	let suffix = 2;
	while (existsSync(path)) {
		path = join(dir, `${date}-${time}-${slug}-${suffix}.md`);
		suffix++;
	}
	writeFileSync(path, `${frontmatter}${body}\n`);

	// Relative when the handoff lives alongside the session; absolute when it
	// lives in another worktree, so the next agent can still find the chain.
	const displayPath = preferRelative ? relative(storageRoot, path) : path;
	return { path, displayPath, dir };
}

function handoffInstruction(focus: string, facts: string): string {
	return [
		"You are ending this session. Write the handoff for the agent that replaces you — it starts with zero history; this document is all it gets.",
		"",
		"Do not call tools; workspace facts are below, use as-is. Reply with ONLY the handoff document — no preamble, no commentary, no file writes. It is saved verbatim.",
		"",
		"<workspace>",
		facts,
		"</workspace>",
		"",
		"Exactly these headings:",
		"# Handoff — <one-line title>",
		"## 1. What went before — goals, progress, key decisions with `file:line` refs, blockers.",
		"## 2. Where things stand — branch/HEAD/uncommitted state, verified vs assumed, risks.",
		"## 3. What comes next — next steps in priority order, open questions, what done looks like.",
		"",
		"Aim for 400-600 words. Redact keys, tokens, passwords, PII.",
		focus ? `Focus: ${focus}` : "",
	].join("\n");
}

export default function (pi: ExtensionAPI) {
	pi.registerCommand("handoff", {
		description: "Write a handoff and continue in a fresh session with it injected",
		handler: async (args, ctx) => {
			if (ctx.mode !== "tui") {
				ctx.ui.notify("handoff requires interactive mode", "error");
				return;
			}
			if (armed) {
				// A turn that never starts (or a session swapped underneath us)
				// would otherwise block every future handoff until /reload.
				const stale =
					armed.sessionId !== ctx.sessionManager.getSessionId() ||
					(!armed.started && Date.now() - armed.armedAt > 60_000);
				if (stale) armed = undefined;
				else {
					ctx.ui.notify("A handoff is already in progress", "warning");
					return;
				}
			}
			if (!ctx.model) {
				ctx.ui.notify("No model selected", "error");
				return;
			}
			if (!ctx.isIdle()) {
				ctx.ui.notify("Finish the current turn before handing off", "warning");
				return;
			}

			const branch = ctx.sessionManager.getBranch();
			const hasConversation = branch.some(
				(entry) =>
					entry.type === "message" &&
					(entry.message as { role?: string }).role !== "system",
			);
			if (!hasConversation) {
				ctx.ui.notify("Nothing to hand off yet", "warning");
				return;
			}

			const { dirFlag, placement, focus } = parseFlags(args);
			const config = readHandoffConfig(ctx.cwd);
			const dirName = resolveDirName(dirFlag, config);
			const { worktreeRoot, mainRoot, inGit } = await resolveRoots(pi, ctx.cwd);
			const mode = placement ?? config.worktrees ?? "root";
			const storageRoot = mode === "current" ? worktreeRoot : mainRoot;

			// Pre-gather workspace facts here so the handoff turn is a single
			// model call with no tool use. `status --short --branch` yields the
			// branch (first `## ` line) plus status in one spawn; the other two
			// run concurrently. `diff --stat` is deliberately skipped — status
			// already lists the changed files and it is the slowest call.
			const run = async (gitArgs: string[], cwd: string): Promise<string> => {
				try {
					const result = await pi.exec("git", gitArgs, { cwd });
					const out = (result.stdout ?? "").trim();
					return result.code === 0 && out ? out : "";
				} catch {
					return "";
				}
			};
			const [statusBranch, head, log] = inGit
				? await Promise.all([
						run(["status", "--short", "--branch"], worktreeRoot),
						run(["rev-parse", "--short", "HEAD"], worktreeRoot),
						run(["log", "--oneline", "-8"], worktreeRoot),
					])
				: ["", "", ""];
			const take = (s: string, n: number): string => s.split("\n").slice(0, n).join("\n");
			const lines = statusBranch.split("\n");
			const branchLine = lines[0]?.startsWith("## ") ? lines[0].slice(3) : "";
			const status = (branchLine ? lines.slice(1) : lines).join("\n");
			const facts = [
				`branch: ${branchLine || "(unknown)"}`,
				`head: ${head || "(unknown)"}`,
				`worktree: ${inGit ? worktreeRoot : ctx.cwd}`,
				`handoffs: ${resolve(storageRoot, dirName)}`,
				"status:",
				take(status, 30) || "(clean)",
				"recent commits:",
				take(log, 8) || "(none)",
			].join("\n");

			// Summarizing memory needs no reasoning budget — drop to minimal
			// for the handoff turn, restore on settle.
			const prevThinking = pi.getThinkingLevel();
			armed = {
				cmdCtx: ctx,
				parentSession: ctx.sessionManager.getSessionFile(),
				sessionId: ctx.sessionManager.getSessionId(),
				storageRoot,
				worktreeRoot,
				dirName,
				prevThinking,
				started: false,
				armedAt: Date.now(),
			};

			ctx.ui.notify("Writing handoff…", "info");
			try {
				pi.setThinkingLevel("minimal");
				pi.sendUserMessage(handoffInstruction(focus, facts));
			} catch (error) {
				try {
					pi.setThinkingLevel(prevThinking);
				} catch {
					// already tearing down; nothing to restore
				}
				armed = undefined;
				ctx.ui.notify(
					`Handoff failed to start: ${error instanceof Error ? error.message : String(error)}`,
					"error",
				);
			}
		},
	});

	// The handoff instruction is sent from the command handler, so the turn it
	// triggers starts asynchronously. Only a settle from that turn may act.
	pi.on("agent_start", async () => {
		if (armed) armed.started = true;
	});

	// The handoff turn is a normal agent run, so it ends here. Capture the final
	// message, persist the document, then swap to the fresh session.
	pi.on("agent_settled", async (_event, ctx) => {
		if (!armed?.started) return;
		const current = armed;
		try {
			pi.setThinkingLevel(current.prevThinking);
		} catch {
			// session context may be stale; the file write below still matters
		}

		const markdown = lastAssistantText(ctx.sessionManager.getBranch());
		if (!markdown || !looksLikeHandoff(markdown)) {
			armed = undefined;
			ctx.ui.notify("Handoff not produced — staying in this session", "warning");
			return;
		}

		let saved: { path: string; displayPath: string; dir: string };
		try {
			saved = persistHandoff(
				current.storageRoot,
				current.dirName,
				current.sessionId,
				markdown,
				current.storageRoot === current.worktreeRoot,
			);
		} catch (error) {
			armed = undefined;
			ctx.ui.notify(
				`Handoff write failed: ${error instanceof Error ? error.message : String(error)}`,
				"error",
			);
			return;
		}

		armed = undefined;
		const document = readFileSync(saved.path, "utf-8");
		const injection = `# handoff: ${saved.displayPath}\n\n${document}`;

		try {
			const result = await current.cmdCtx.newSession({
				parentSession: current.parentSession,
				withSession: async (replacement) => {
					replacement.ui.notify(`Handoff → ${saved.displayPath}`, "info");
					await replacement.sendUserMessage(injection);
				},
			});
			if (result.cancelled) {
				ctx.ui.notify(
					`Handoff written to ${saved.displayPath}; new session cancelled`,
					"info",
				);
			}
		} catch (error) {
			// The command context went stale (e.g. /reload ran mid-handoff). The
			// document is on disk, so the work is recoverable.
			try {
				ctx.ui.notify(
					`Handoff written to ${saved.displayPath}, but the new session failed: ${error instanceof Error ? error.message : String(error)}`,
					"error",
				);
			} catch {
				// the old context is already torn down; the file on disk is the record
			}
		}
	});
}
