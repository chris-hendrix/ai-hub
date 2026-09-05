/**
 * Subagent status — renders live subagent activity into pi's footer status bar.
 *
 * Polls the installed pi-subagents package via its in-process RPC `status`
 * method and reads the fleet DTO (agent + goal per active run), then writes a
 * single footer line:
 *
 *   ⧉ 2 · fast: fix auth redirect · mid: review API types
 *
 * Clears the status segment when no subagents are active.
 */

import { randomUUID } from "node:crypto";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const POLL_MS = 1500;
const MAX_ENTRIES = 2;
const GOAL_CAP = 40;

interface FleetEntry {
	agent?: string;
	goal?: string;
}

interface Fleet {
	entries?: FleetEntry[];
	totalActive?: number;
}

interface StatusReply {
	success?: boolean;
	data?: { fleet?: Fleet };
}

function truncate(s: string, n: number): string {
	return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;
}

export default function (pi: ExtensionAPI) {
	let timer: ReturnType<typeof setInterval> | undefined;
	let misses = 0;

	function render(ctx: ExtensionContext, fleet: Fleet) {
		const entries = fleet.entries ?? [];
		const total = fleet.totalActive ?? entries.length;
		if (total === 0) {
			ctx.ui.setStatus("subagents", undefined);
			return;
		}
		const shown = entries.slice(0, MAX_ENTRIES).map((e) => {
			const goal = (e.goal ?? "").trim();
			return goal ? `${e.agent ?? "?"}: ${truncate(goal, GOAL_CAP)}` : `${e.agent ?? "?"}`;
		});
		let line = `⧉ ${total} · ${shown.join(" · ")}`;
		if (total > shown.length) line += ` · +${total - shown.length}`;
		ctx.ui.setStatus("subagents", line);
	}

	function poll(ctx: ExtensionContext) {
		const requestId = randomUUID();
		const channel = `subagents:rpc:v1:reply:${requestId}`;
		const guard = setTimeout(() => {
			unsubscribe();
			if (++misses >= 3) ctx.ui.setStatus("subagents", undefined);
		}, POLL_MS + 500);
		const unsubscribe = pi.events.on(channel, (reply) => {
			clearTimeout(guard);
			unsubscribe();
			const r = reply as StatusReply;
			if (r?.success !== true || !r.data?.fleet) {
				if (++misses >= 3) ctx.ui.setStatus("subagents", undefined);
				return;
			}
			misses = 0;
			render(ctx, r.data.fleet);
		});
		pi.events.emit("subagents:rpc:v1:request", { version: 1, requestId, method: "status", params: {} });
	}

	pi.on("session_start", async (_event, ctx) => {
		if (timer) return;
		poll(ctx);
		timer = setInterval(() => poll(ctx), POLL_MS);
	});

	pi.on("session_shutdown", async () => {
		if (timer) {
			clearInterval(timer);
			timer = undefined;
		}
	});
}
