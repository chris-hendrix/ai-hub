/**
 * Modes extension — named main-session personas (plan / orchestrate / build).
 *
 * Mode definitions live in settings.json under "modes". Each mode references a
 * model tier by name ("deep" | "mid" | "fast"); tiers resolve through
 * subagents.agentOverrides.<tier>.model — the same table pi-subagents uses for
 * the deep/mid/fast subagents, so a tier's model is defined in one place.
 *
 *   /plan  /orchestrate  /build   — switch directly
 *   /mode                          — show current mode + list
 *   /mode <name> | /mode off       — switch / restore defaults
 *   Ctrl+Shift+U                   — cycle modes
 *   pi --preset <name>             — start in a mode
 *
 * plan mode gets a write guard: write/edit are blocked outside .thoughts/.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { CONFIG_DIR_NAME, getAgentDir, type ExtensionAPI, type ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Key } from "@earendil-works/pi-tui";

interface Mode {
	model?: string;
	tools?: string[];
	instructions?: string;
}

interface SettingsShape {
	modes?: Record<string, Mode>;
	subagents?: { agentOverrides?: Record<string, { model?: string }> };
}

function readJson(p: string): Record<string, unknown> {
	if (!existsSync(p)) return {};
	try {
		const v = JSON.parse(readFileSync(p, "utf-8"));
		return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
	} catch {
		return {};
	}
}

function loadSettings(cwd: string): SettingsShape {
	const global = readJson(join(getAgentDir(), "settings.json"));
	const project = readJson(join(cwd, CONFIG_DIR_NAME, "settings.json"));
	return { ...global, ...project } as SettingsShape;
}

export default function (pi: ExtensionAPI) {
	let modes: Record<string, Mode> = {};
	let overrides: Record<string, { model?: string }> = {};
	let active: string | undefined;
	let original: { model: Parameters<typeof pi.setModel>[0] | undefined; tools: string[] } | undefined;

	const refresh = (cwd: string) => {
		const s = loadSettings(cwd);
		modes = s.modes ?? {};
		overrides = s.subagents?.agentOverrides ?? {};
	};

	/** Resolve "deep" | "mid" | "fast" (or a literal provider/id) to {provider, id}. */
	function resolveModelSpec(spec: string): { provider: string; id: string } {
		if (!spec.includes("/") && overrides[spec]?.model) spec = overrides[spec].model;
		const slash = spec.indexOf("/");
		if (slash > 0) return { provider: spec.slice(0, slash), id: spec.slice(slash + 1) };
		return { provider: "deepseek", id: spec };
	}

	async function applyMode(name: string, ctx: ExtensionContext): Promise<boolean> {
		const mode = modes[name];
		if (!mode) return false;

		if (active === undefined) {
			original = { model: ctx.model, tools: pi.getActiveTools() };
		}

		if (mode.model) {
			const { provider, id } = resolveModelSpec(mode.model);
			const model = ctx.modelRegistry.find(provider, id);
			if (model) {
				const ok = await pi.setModel(model);
				if (!ok) ctx.ui.notify(`Mode "${name}": no API key for ${provider}/${id}`, "warning");
			} else {
				ctx.ui.notify(`Mode "${name}": model ${provider}/${id} not found`, "warning");
			}
		}

		if (mode.tools && mode.tools.length > 0) {
			const valid = mode.tools.filter((t) => pi.getAllTools().some((x) => x.name === t));
			if (valid.length > 0) pi.setActiveTools(valid);
		}

		active = name;
		ctx.ui.setStatus("mode", ctx.ui.theme.fg("accent", `mode:${name}`));
		ctx.ui.notify(`Mode: ${name}`, "info");
		return true;
	}

	async function restore(ctx: ExtensionContext) {
		active = undefined;
		if (original) {
			if (original.model) await pi.setModel(original.model);
			pi.setActiveTools(original.tools);
		}
		ctx.ui.setStatus("mode", undefined);
		ctx.ui.notify("Mode off — defaults restored", "info");
	}

	// Register one command per mode from global config at load time.
	refresh(process.cwd());
	for (const name of Object.keys(modes)) {
		pi.registerCommand(name, {
			description: `Switch to ${name} mode`,
			handler: async (_args, ctx) => {
				if (!(await applyMode(name, ctx))) {
					ctx.ui.notify(`Unknown mode "${name}"`, "error");
				}
			},
		});
	}

	pi.registerFlag("preset", { type: "string", description: "Start in a named mode" });

	pi.registerCommand("mode", {
		description: "Show or switch mode",
		handler: async (args, ctx) => {
			const name = args?.trim();
			if (!name) {
				const list = Object.keys(modes).map((m) => (m === active ? `${m} (active)` : m)).join(", ") || "(none)";
				ctx.ui.notify(`Modes: ${list}`, "info");
				return;
			}
			if (name === "off") return restore(ctx);
			if (!(await applyMode(name, ctx))) {
				ctx.ui.notify(`Unknown mode "${name}". Available: ${Object.keys(modes).join(", ") || "(none)"}`, "error");
			}
		},
	});

	pi.registerShortcut(Key.ctrlShift("u"), {
		description: "Cycle modes",
		handler: async (ctx) => {
			const names = Object.keys(modes).sort();
			if (names.length === 0) return ctx.ui.notify("No modes defined", "warning");
			const idx = active ? names.indexOf(active) : -1;
			await applyMode(names[(idx + 1) % names.length], ctx);
		},
	});

	// Refresh config (picks up project-level overrides) and honor --preset.
	pi.on("session_start", async (_event, ctx) => {
		refresh(ctx.cwd);
		const flag = pi.getFlag("preset");
		if (typeof flag === "string" && flag && modes[flag]) {
			await applyMode(flag, ctx);
		}
	});

	// Inject the active mode's instructions into the system prompt each turn.
	pi.on("before_agent_start", async (event) => {
		if (active && modes[active]?.instructions) {
			return { systemPrompt: `${event.systemPrompt}\n\n${modes[active].instructions}` };
		}
	});

	// plan-mode guard: writes are only allowed under .thoughts/.
	pi.on("tool_call", async (event, ctx) => {
		if (active !== "plan") return;
		if (event.toolName !== "write" && event.toolName !== "edit") return;
		const p = (event.input as { path?: unknown } | undefined)?.path;
		if (!p) return;
		const thoughts = resolve(ctx.cwd, ".thoughts");
		const target = resolve(ctx.cwd, String(p));
		if (target !== thoughts && !target.startsWith(thoughts + sep)) {
			return { block: true, reason: `plan mode: writes are only allowed under .thoughts/ (got ${String(p)})` };
		}
	});
}
