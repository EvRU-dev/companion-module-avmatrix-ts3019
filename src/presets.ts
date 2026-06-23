import type {
	CompanionPresetDefinitions,
	CompanionPresetSection,
	CompanionSimplePresetDefinition,
} from '@companion-module/base'
import type { ModuleSchema } from './main.js'
import type ModuleInstance from './main.js'

export function UpdatePresets(self: ModuleInstance): void {
	const structure: CompanionPresetSection[] = [
		{
			id: 'lamps',
			name: 'Lamp Controls',
			definitions: [
				{
					id: 'program',
					name: 'Program',
					description: 'Set a lamp to red program tally',
					type: 'simple',
					presets: makePresetIds('program'),
				},
				{
					id: 'preview',
					name: 'Preview',
					description: 'Set a lamp to green preview tally',
					type: 'simple',
					presets: makePresetIds('preview'),
				},
				{
					id: 'off',
					name: 'Off',
					description: 'Turn a lamp off',
					type: 'simple',
					presets: makePresetIds('off'),
				},
			],
		},
	]

	const presets: CompanionPresetDefinitions<ModuleSchema> = {}
	for (let lamp = 1; lamp <= 12; lamp++) {
		presets[`lamp_${lamp}_program`] = makePreset(lamp, 'program', 'PGM', 0xff0000, 0xffffff)
		presets[`lamp_${lamp}_preview`] = makePreset(lamp, 'preview', 'PVW', 0x00aa33, 0xffffff)
		presets[`lamp_${lamp}_off`] = makePreset(lamp, 'off', 'OFF', 0x222222, 0xffffff)
	}

	self.setPresetDefinitions(structure, presets)
}

function makePresetIds(state: 'program' | 'preview' | 'off'): string[] {
	return Array.from({ length: 12 }, (_, index) => `lamp_${index + 1}_${state}`)
}

function makePreset(
	lamp: number,
	state: 'program' | 'preview' | 'off',
	label: string,
	bgcolor: number,
	color: number,
): CompanionSimplePresetDefinition<ModuleSchema> {
	return {
		type: 'simple' as const,
		name: `Lamp ${lamp} ${label}`,
		style: {
			text: `L${lamp}\\n${label}`,
			size: 'auto' as const,
			color,
			bgcolor,
			show_topbar: false,
		},
		steps: [
			{
				down: [
					{
						actionId: 'set_lamp' as const,
						options: {
							lamp,
							state,
							mode: 'exclusive',
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'lamp_state' as const,
				options: {
					lamp,
					state,
				},
				style: {
					bgcolor,
					color,
				},
			},
		],
	}
}
