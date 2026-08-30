/**
 * Modes extension — named main-session personas (plan / orchestrate / build).
 *
 * Mode definitions live in settings.json under "modes". Each mode references a
 * model tier by name ("deep" | "mid" | "fast" | "researcher"); tiers resolve
 * through subagents.agentOverrides.<tier>.model — the same table pi-subagents
 * uses for the deep/mid/fast/researcher subagents, so a tier's model is
 * defined in one place.
 *
 *   /plan  /orchestrate  /build   — switch directly
 *   /mode                          — show current mode + list
 *   /mode <name> | /mode off       — switch / restore defaults
 *   Shift+Tab                      — cycle modes (vanilla → plan → orchestrate → build → vanilla)
 *   pi --preset <name>             — start in a mode
 *
 * Shift+Tab cycles through vanilla (no mode) and all defined modes.
 * Vanilla = plain pi, no extra instructions, original tools/model restored.
 * plan mode gets a write guard: write/edit are blocked outside .thoughts/.
 *
 * Settings-level default: add "defaultMode": "plan" at the top level of
 * settings.json to have pi start in that mode. --preset still wins.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { CONFIG_DIR_NAME, getAgentDir, type ExtensionAPI, type ExtensionContext } from "@earendil-works/pi-coding-agent";
import { Key } from "@earendil-works/pi-tui";

/** Vanilla entry shown in /mode and the Shift+Tab cycle — no mode active. */
const VANILLA_LABEL = "(default)";

interface Mode {
	model?: string;
	thinkingLevel?: string;
	tools?: string[];
	instructions?: string;
}

interface SettingsShape {
	defaultProvider?: string;
	defaultMode?: string;
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

function deepMerge<T extends Record<string, unknown>>(base: T, patch: T): T {
	const out: Record<string, unknown> = { ...base };
	for (const [k, v] of Object.entries(patch)) {
		if (
			v &&
			typeof v === "object" &&
			!Array.isArray(v) &&
			base[k] &&
			typeof base[k] === "object" &&
			!Array.isArray(base[k])
		) {
			out[k] = deepMerge(
				base[k] as Record<string, unknown>,
				v as Record<string, unknown>,
			);
		} else {
			out[k] = v as unknown;
		}
	}
	return out as T;
}

function loadSettings(cwd: string): SettingsShape {
	const global = readJson(join(getAgentDir(), "settings.json")) as SettingsShape;
	const projectRaw = readJson(join(cwd, CONFIG_DIR_NAME, "settings.json")) as SettingsShape;
	const project = Object.keys(projectRaw).length > 0 ? projectRaw : undefined;
	if (!project) return global;
	// Deep merge so project subagents.agentOverrides extends global instead of clobbering it.
	return deepMerge(global as unknown as Record<string, unknown>, project as unknown as Record<string, unknown>) as SettingsShape;
}

export default function (pi: ExtensionAPI) {
	// Insertion order of modes as declared in global settings — the logical cycle order.
	let modeOrder: string[] = [];
	let modes: Record<string, Mode> = {};
	let overrides: Record<string, { model?: string }> = {};
	let defaultProvider: string | undefined;
	let defaultMode: string | undefined;
	let active: string | undefined;
	let original: { model: Parameters<typeof pi.setModel>[0] | undefined; tools: string[] } | undefined;

	const refresh = (cwd: string) => {
		const s = loadSettings(cwd);
		modes = s.modes ?? {};
		overrides = s.subagents?.agentOverrides ?? {};
		defaultProvider = s.defaultProvider;
		defaultMode = s.defaultMode;
		// Track insertion order from global settings for the cycle shortcut.
		const globalRaw = readJson(join(getAgentDir(), "settings.json")) as SettingsShape;
		modeOrder = globalRaw.modes ? Object.keys(globalRaw.modes) : Object.keys(modes);
	};

	/** Resolve "deep" | "mid" | "fast" | "researcher" (or a literal provider/id) to {provider, id}. */
	function resolveModelSpec(spec: string): { provider: string; id: string } {
		if (!spec.includes("/") && overrides[spec]?.model) spec = overrides[spec].model;
		const slash = spec.indexOf("/");
		if (slash > 0) return { provider: spec.slice(0, slash), id: spec.slice(slash + 1) };
		return { provider: defaultProvider ?? "deepseek", id: spec };
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

	function registerModeCommands() {
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
	}

	// Register per-mode commands from global config at load time.
	refresh(process.cwd());
	registerModeCommands();

	pi.registerFlag("preset", { type: "string", description: "Start in a named mode" });

	pi.registerCommand("mode", {
		description: "Show or switch mode",
		handler: async (args, ctx) => {
			const name = args?.trim();
			if (!name) {
				const all = [VANILLA_LABEL, ...Object.keys(modes)];
				const list = all.map((m) => (m === (active ?? VANILLA_LABEL) ? `${m} (active)` : m)).join(", ");
				ctx.ui.notify(`Modes: ${list}`, "info");
				return;
			}
			if (name === "off" || name === VANILLA_LABEL || name === "default" || name === "vanilla") return restore(ctx);
			if (!(await applyMode(name, ctx))) {
				ctx.ui.notify(`Unknown mode "${name}". Available: ${Object.keys(modes).join(", ") || "(none)"}`, "error");
			}
		},
	});

	// Shift+Tab cycles: (default) → plan → orchestrate → build → (default)
	const getCycleNames = (): string[] => {
		const names = modeOrder.length > 0 ? modeOrder : Object.keys(modes).sort();
		return [VANILLA_LABEL, ...names];
	};

	pi.registerShortcut(Key.shift("tab"), {
		description: "Cycle modes",
		handler: async (ctx) => {
			const names = getCycleNames();
			if (names.length <= 1) return ctx.ui.notify("No modes defined", "warning");
			const current = active ?? VANILLA_LABEL;
			const idx = names.indexOf(current);
			const next = names[(idx + 1) % names.length];
			if (next === VANILLA_LABEL) {
				await restore(ctx);
			} else {
				await applyMode(next, ctx);
			}
		},
	});

	// Refresh config (picks up project-level overrides), register any project-defined
	// mode commands, and honor --preset or the persisted defaultMode.
	pi.on("session_start", async (_event, ctx) => {
		const before = new Set(Object.keys(modes));
		refresh(ctx.cwd);
		for (const name of Object.keys(modes)) {
			if (!before.has(name)) {
				pi.registerCommand(name, {
					description: `Switch to ${name} mode`,
					handler: async (_args, innerCtx) => {
						if (!(await applyMode(name, innerCtx))) {
							innerCtx.ui.notify(`Unknown mode "${name}"`, "error");
						}
					},
				});
			}
		}
		const flag = pi.getFlag("preset");
		if (typeof flag === "string" && flag && modes[flag]) {
			await applyMode(flag, ctx);
			return;
		}
		if (defaultMode && modes[defaultMode] && !active) {
			await applyMode(defaultMode, ctx);
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

	// orchestrate read-only bash guard: only git status/diff/log/show/branch/rev-parse allowed
	const ORCH_READONLY_BASH = /^(git\s+(status|diff|log|show|branch|rev-parse|ls-files)(\s|$))/;
	pi.on("tool_call", async (event) => {
		if (active !== "orchestrate") return;
		if (event.toolName !== "bash") return;
		const cmd = String((event.input as { command?: unknown } | undefined)?.command ?? "").trim();
		if (!ORCH_READONLY_BASH.test(cmd)) {
			return {
				block: true,
				reason: `orchestrate mode: bash is read-only — only git status/diff/log/show/branch/rev-parse/ls-files allowed (got: ${cmd.slice(0, 80)})`,
			};
		}
	});
}
