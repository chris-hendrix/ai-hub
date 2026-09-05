/**
 * Subagent status — renders a live subagent count into pi's footer status bar.
 *
 * Polls the installed pi-subagents package via its in-process RPC `status`
 * method and reads the fleet DTO's active count, then writes a single footer
 * segment (`⧉ 2`). Detail lives in chat (async panels) and FleetView; the
 * footer is just a persistent glanceable count. Clears when idle.
 */

import { randomUUID } from "node:crypto";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const POLL_MS = 1500;

interface Fleet {
	entries?: unknown[];
	totalActive?: number;
}

interface StatusReply {
	success?: boolean;
	data?: { fleet?: Fleet };
}

export default function (pi: ExtensionAPI) {
	let timer: ReturnType<typeof setInterval> | undefined;
	let misses = 0;

	function render(ctx: ExtensionContext, fleet: Fleet) {
		const total = fleet.totalActive ?? fleet.entries?.length ?? 0;
		if (total === 0) {
			ctx.ui.setStatus("subagents", undefined);
			return;
		}
		ctx.ui.setStatus("subagents", `⧉ ${total}`);
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
