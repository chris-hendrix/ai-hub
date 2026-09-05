/**
 * Modes extension — tier personas (deep / mid / fast / view).
 *
 * Mode definitions live in settings.json under "modes". Each mode references a
 * model tier by name ("deep" | "mid" | "fast" | "view"); tiers resolve
 * through subagents.agentOverrides.<tier>.model — the same table pi-subagents
 * uses for the deep/mid/fast/view subagents, so a tier's model is
 * defined in one place.
 *
 * A mode's instructions and tools come from its tier agent file
 * (<agentDir>/agents/<tier>.md) — the body is injected as the mode's
 * instructions and the frontmatter `tools` become the mode's tool allowlist.
 * Explicit `instructions` / `tools` on a mode definition override the file,
 * so the agent file stays the single source of truth for each tier.
 *
 *   /deep  /mid  /fast  /view   — switch directly
 *   /mode                       — show current mode + list
 *   /mode <name> | /mode off    — switch / restore defaults
 *   Shift+Tab                   — cycle modes (vanilla → deep → mid → fast → view → vanilla)
 *   pi --preset <name>          — start in a mode
 *
 * Changing the model or thinking level while in a mode (via /model, Ctrl+P, or
 * /thinking) persists the new values as the defaults for that tier — it writes
 * back to subagents.agentOverrides.<tier>.{model,thinking} so both the mode and
 * its subagents use the new defaults next time.
 *
 * Shift+Tab cycles through vanilla (no mode) and all defined modes.
 * Vanilla = plain pi, no extra instructions, original tools/model restored.
 *
 * Settings-level default: add "defaultMode": "fast" at the top level of
 * settings.json to have pi start in that mode. --preset still wins.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
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
	subagents?: { agentOverrides?: Record<string, { model?: string; thinking?: string }> };
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
	let overrides: Record<string, { model?: string; thinking?: string }> = {};
	let defaultProvider: string | undefined;
	let defaultMode: string | undefined;
	let active: string | undefined;
	let original: { model: Parameters<typeof pi.setModel>[0] | undefined; tools: string[]; thinking: string } | undefined;
	let applyingModel = false;
	let applyingThinking = false;

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

	/** Resolve "deep" | "mid" | "fast" | "view" (or a literal provider/id) to {provider, id}. */
	function resolveModelSpec(spec: string): { provider: string; id: string } {
		if (!spec.includes("/") && overrides[spec]?.model) spec = overrides[spec].model;
		const slash = spec.indexOf("/");
		if (slash > 0) return { provider: spec.slice(0, slash), id: spec.slice(slash + 1) };
		return { provider: defaultProvider ?? "deepseek", id: spec };
	}

	/** Read a tier agent file (<agentDir>/agents/<name>.md): frontmatter tools + body. */
	function readAgentFile(name: string): { tools?: string[]; body?: string } {
		if (!/^[A-Za-z0-9_-]+$/.test(name)) return {};
		const p = join(getAgentDir(), "agents", `${name}.md`);
		let raw: string;
		try {
			if (!existsSync(p)) return {};
			raw = readFileSync(p, "utf-8");
		} catch {
			return {};
		}
		const lines = raw.split("\n");
		let fmLines: string[] = [];
		let bodyLines: string[] = lines;
		if (lines[0]?.trim() === "---") {
			let end = -1;
			for (let i = 1; i < lines.length; i++) {
				if (lines[i]?.trim() === "---") {
					end = i;
					break;
				}
			}
			if (end !== -1) {
				fmLines = lines.slice(1, end);
				bodyLines = lines.slice(end + 1);
			}
		}
		let tools: string[] | undefined;
		for (let i = 0; i < fmLines.length; i++) {
			const m = fmLines[i]?.match(/^tools:\s*(.*)$/);
			if (!m) continue;
			const rest = (m[1] ?? "").trim();
			if (rest) {
				tools = rest
					.split(",")
					.map((t) => t.trim())
					.filter(Boolean);
			} else {
				const items: string[] = [];
				for (let j = i + 1; j < fmLines.length; j++) {
					const item = fmLines[j]?.match(/^\s*-\s+(.+)$/)?.[1]?.trim();
					if (!item) break;
					items.push(item);
				}
				if (items.length > 0) tools = items;
			}
			break;
		}
		const body = bodyLines.join("\n").trim() || undefined;
		return { tools, body };
	}

	function persistOverride(tier: string, patch: { model?: string; thinking?: string }) {
		const p = join(getAgentDir(), "settings.json");
		if (!existsSync(p)) return;
		try {
			const raw = JSON.parse(readFileSync(p, "utf-8")) as Record<string, unknown>;
			const sub = ((raw.subagents as Record<string, unknown> | undefined) ?? (raw.subagents = {})) as Record<string, unknown>;
			const ao = ((sub.agentOverrides as Record<string, unknown> | undefined) ?? (sub.agentOverrides = {})) as Record<string, Record<string, unknown>>;
			const entry = ((ao[tier] as Record<string, unknown> | undefined) ?? (ao[tier] = {})) as Record<string, unknown>;
			if (patch.model !== undefined) entry.model = patch.model;
			if (patch.thinking !== undefined) entry.thinking = patch.thinking;
			writeFileSync(p, JSON.stringify(raw, null, 2) + "\n");
		} catch {
			// best-effort; don't break the session on a write failure
		}
	}

	async function applyMode(name: string, ctx: ExtensionContext): Promise<boolean> {
		const mode = modes[name];
		if (!mode) return false;

		if (active === undefined) {
			original = { model: ctx.model, tools: pi.getActiveTools(), thinking: pi.getThinkingLevel() };
		}

		if (mode.model) {
			const { provider, id } = resolveModelSpec(mode.model);
			const model = ctx.modelRegistry.find(provider, id);
			if (model) {
				applyingModel = true;
				try {
					const ok = await pi.setModel(model);
					if (!ok) ctx.ui.notify(`Mode "${name}": no API key for ${provider}/${id}`, "warning");
				} finally {
					applyingModel = false;
				}
			} else {
				ctx.ui.notify(`Mode "${name}": model ${provider}/${id} not found`, "warning");
			}
		}

		const thinking = mode.thinkingLevel ?? (mode.model ? overrides[mode.model]?.thinking : undefined);
		if (thinking) {
			applyingThinking = true;
			try {
				pi.setThinkingLevel(thinking as Parameters<typeof pi.setThinkingLevel>[0]);
			} finally {
				applyingThinking = false;
			}
		}

		// Explicit mode tools win; otherwise the tier's agent file frontmatter
		// (<agentDir>/agents/<tier>.md) is the single source of truth.
		const toolList = mode.tools && mode.tools.length > 0 ? mode.tools : readAgentFile(name).tools;
		if (toolList && toolList.length > 0) {
			const valid = toolList.filter((t) => pi.getAllTools().some((x) => x.name === t));
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
			pi.setThinkingLevel(original.thinking as Parameters<typeof pi.setThinkingLevel>[0]);
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

	// Shift+Tab cycles: (default) → deep → mid → fast → view → (default)
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
	// Explicit mode instructions win; otherwise the tier's agent file body
	// (<agentDir>/agents/<tier>.md) is the single source of truth.
	pi.on("before_agent_start", async (event) => {
		if (!active) return;
		const explicit = modes[active]?.instructions;
		if (explicit) {
			return { systemPrompt: `${event.systemPrompt}\n\n${explicit}` };
		}
		const { body } = readAgentFile(active);
		if (body) {
			return { systemPrompt: `${event.systemPrompt}\n\nYou are in ${active.toUpperCase()} mode.\n\n${body}` };
		}
	});

	// Model + thinking persistence: changing the model or thinking level while in a
	// tier mode updates that tier's defaults (agentOverrides.<tier>.{model,thinking})
	// so both the mode and its subagents use the new values next session.
	pi.on("model_select", async (event, ctx) => {
		if (!active || applyingModel) return;
		const source = (event as { source?: string }).source;
		if (source === "restore") return;
		const newSpec = event.model ? `${event.model.provider}/${event.model.id}` : undefined;
		if (!newSpec) return;
		const current = overrides[active]?.model;
		if (!current || newSpec === current) return;
		overrides[active] = { ...overrides[active], model: newSpec };
		persistOverride(active, { model: newSpec });
		ctx.ui.notify(`"${active}" default model updated: ${newSpec}`, "info");
	});

	pi.on("thinking_level_select", async (event, ctx) => {
		if (!active || applyingThinking) return;
		const level = (event as { level?: string }).level;
		if (!level) return;
		if (overrides[active]?.thinking === level) return;
		overrides[active] = { ...overrides[active], thinking: level };
		persistOverride(active, { thinking: level });
		ctx.ui.notify(`"${active}" default thinking updated: ${level}`, "info");
	});
}
