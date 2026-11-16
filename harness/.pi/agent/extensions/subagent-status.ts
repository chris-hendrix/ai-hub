/**
 * Subagent status — renders a live subagent count into pi's footer status bar.
 *
 * Polls the installed pi-subagents package via its in-process RPC `status`
 * method and reads the fleet DTO's active count, then writes a single footer
 * segment (`⧉ 2 subagents`). Detail lives in chat (async panels) and FleetView; the
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
	// Guards and subscriptions from in-flight polls. POLL_MS (1500) is shorter
	// than the guard (2000), so polls overlap and several can be pending at once.
	const pending = new Set<() => void>();

	/**
	 * A timer outlives the session that armed it. `ctx.ui` throws once the
	 * session has been replaced, reloaded or shut down, and an unhandled throw
	 * in a timer takes the whole runner process with it — which is how a run
	 * whose work had already committed still got recorded as failed. So the
	 * write is made non-fatal, and a stale ctx stops the poll instead of dying.
	 */
	function setStatus(ctx: ExtensionContext, value: string | undefined) {
		try {
			ctx.ui.setStatus("subagents", value);
		} catch {
			stop();
		}
	}

	function stop() {
		if (timer) {
			clearInterval(timer);
			timer = undefined;
		}
		for (const cancel of pending) cancel();
		pending.clear();
	}

	function render(ctx: ExtensionContext, fleet: Fleet) {
		const total = fleet.totalActive ?? fleet.entries?.length ?? 0;
		if (total === 0) {
			setStatus(ctx, undefined);
			return;
		}
		setStatus(ctx, `⧉ ${total} subagent${total === 1 ? "" : "s"}`);
	}

	function poll(ctx: ExtensionContext) {
		const requestId = randomUUID();
		const channel = `subagents:rpc:v1:reply:${requestId}`;
		const finish = () => {
			clearTimeout(guard);
			unsubscribe();
			pending.delete(finish);
		};
		const guard = setTimeout(() => {
			finish();
			if (++misses >= 3) setStatus(ctx, undefined);
		}, POLL_MS + 500);
		const unsubscribe = pi.events.on(channel, (reply) => {
			finish();
			const r = reply as StatusReply;
			if (r?.success !== true || !r.data?.fleet) {
				if (++misses >= 3) setStatus(ctx, undefined);
				return;
			}
			misses = 0;
			render(ctx, r.data.fleet);
		});
		pending.add(finish);
		pi.events.emit("subagents:rpc:v1:request", { version: 1, requestId, method: "status", params: {} });
	}

	pi.on("session_start", async (_event, ctx) => {
		if (timer) return;
		poll(ctx);
		timer = setInterval(() => poll(ctx), POLL_MS);
	});

	pi.on("session_shutdown", async () => {
		stop();
	});
}
