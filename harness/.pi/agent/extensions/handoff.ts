/**
 * handoff — one command from one session to the next.
 *
 *   /handoff [focus]
 *
 *   1. gathers workspace facts (branch, HEAD, status, recent commits,
 *      diffstat) and asks this session's agent to write a handoff for the
 *      agent that replaces it. The facts ride along in the instruction, so
 *      the turn is a single model call with no tool use.
 *   2. persists the result to .handoffs/<date>-<HHMMSS>-<slug>.md with
 *      frontmatter carrying the chain of session ids.
 *   3. starts a fresh session and injects the handoff as a plain user message,
 *      which the agent picks up automatically.
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

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import type {
	ExtensionAPI,
	ExtensionCommandContext,
	SessionEntry,
} from "@earendil-works/pi-coding-agent";

interface Armed {
	/** Command context — the only context that can start a session. */
	cmdCtx: ExtensionCommandContext;
	/** Session file being left, recorded as the new session's parent. */
	parentSession: string | undefined;
	/** This session's id, appended to the handoff's session chain. */
	sessionId: string;
	/** Repository root the handoff file is written under. */
	repoRoot: string;
	/** Set once the handoff turn actually starts, so a late settle cannot act. */
	started: boolean;
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

/**
 * Chain of session ids: the newest handoff's chain, with this session appended,
 * so the documents link together across sessions.
 */
function chainSessions(dir: string, sessionId: string): string[] {
	let newest: string | undefined;
	try {
		newest = readdirSync(dir)
			.filter((file) => file.endsWith(".md"))
			.sort()
			.at(-1);
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
	return chain;
}

function persistHandoff(
	repoRoot: string,
	sessionId: string,
	markdown: string,
): { path: string; relativePath: string } {
	const dir = join(repoRoot, ".handoffs");
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

	return { path, relativePath: relative(repoRoot, path) };
}

function handoffInstruction(focus: string, facts: string): string {
	return [
		"You are ending this session and writing a handoff for the agent that replaces you. That agent has zero conversation history — this document is the only thing it starts with.",
		"",
		"Do not call any tools. The current workspace facts are provided below — use them as-is, do not re-gather them. Answer with ONLY the handoff document as your next and final message — no preamble, no commentary, no file writes. Your message is saved verbatim.",
		"",
		"<workspace>",
		facts,
		"</workspace>",
		"",
		"Use exactly this shape:",
		"",
		"# Handoff — <one-line title of this session>",
		"",
		"## 1. What went before",
		"Goals, progress, key decisions with `file:line` refs, blockers and how they were resolved.",
		"",
		"## 2. Where things stand",
		"Workspace state (branch, HEAD, uncommitted changes), what is verified vs assumed, risks, `file:line` refs.",
		"",
		"## 3. What comes next",
		"Concrete next steps in priority order, open questions, what done looks like.",
		"",
		"Redact API keys, passwords, tokens, and PII. Be specific and complete: the next agent cannot ask you anything.",
		focus ? `\nTailor the handoff to this focus: ${focus}` : "",
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
				ctx.ui.notify("A handoff is already in progress", "warning");
				return;
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

			const root = await pi.exec("git", ["rev-parse", "--show-toplevel"], { cwd: ctx.cwd });
			const repoRoot = root.code === 0 && root.stdout.trim() ? root.stdout.trim() : ctx.cwd;

			// Pre-gather workspace facts here so the handoff turn is a single
			// model call with no tool use — far faster than letting the agent
			// shell out for each fact through its own tool loop.
			const run = async (args: string[]): Promise<string> => {
				try {
					const result = await pi.exec("git", args, { cwd: repoRoot });
					const out = (result.stdout ?? "").trim();
					return result.code === 0 && out ? out : "";
				} catch {
					return "";
				}
			};
			const [gitBranch, head, status, log, diffstat] = await Promise.all([
				run(["branch", "--show-current"]),
				run(["rev-parse", "--short", "HEAD"]),
				run(["status", "--short"]),
				run(["log", "--oneline", "-8"]),
				run(["diff", "--stat"]),
			]);
			const take = (s: string, n: number): string => s.split("\n").slice(0, n).join("\n");
			const facts = [
				`branch: ${gitBranch || "(unknown)"}`,
				`head: ${head || "(unknown)"}`,
				"status:",
				take(status, 30) || "(clean)",
				"recent commits:",
				take(log, 8) || "(none)",
				"diffstat:",
				take(diffstat, 15) || "(none)",
			].join("\n");

			armed = {
				cmdCtx: ctx,
				parentSession: ctx.sessionManager.getSessionFile(),
				sessionId: ctx.sessionManager.getSessionId(),
				repoRoot,
				started: false,
			};

			ctx.ui.notify("Writing handoff…", "info");
			try {
				pi.sendUserMessage(handoffInstruction(args.trim(), facts));
			} catch (error) {
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

		const markdown = lastAssistantText(ctx.sessionManager.getBranch());
		if (!markdown || !looksLikeHandoff(markdown)) {
			armed = undefined;
			ctx.ui.notify("Handoff not produced — staying in this session", "warning");
			return;
		}

		let saved: { path: string; relativePath: string };
		try {
			saved = persistHandoff(current.repoRoot, current.sessionId, markdown);
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
		const injection = `# handoff: ${saved.relativePath}\n\n${document}`;

		try {
			const result = await current.cmdCtx.newSession({
				parentSession: current.parentSession,
				withSession: async (replacement) => {
					replacement.ui.notify(`Handoff → ${saved.relativePath}`, "info");
					await replacement.sendUserMessage(injection);
				},
			});
			if (result.cancelled) {
				ctx.ui.notify(
					`Handoff written to ${saved.relativePath}; new session cancelled`,
					"info",
				);
			}
		} catch (error) {
			// The command context went stale (e.g. /reload ran mid-handoff). The
			// document is on disk, so the work is recoverable.
			try {
				ctx.ui.notify(
					`Handoff written to ${saved.relativePath}, but the new session failed: ${error instanceof Error ? error.message : String(error)}`,
					"error",
				);
			} catch {
				// the old context is already torn down; the file on disk is the record
			}
		}
	});
}
