import type ModuleInstance from './main.js'
import type { TallyState } from './ts3019.js'

export type TallySetMode = 'exclusive' | 'additive'
export type TallyActionState = TallyState | 'clear_preview' | 'clear_program'

export type ActionsSchema = {
	set_lamp: {
		options: {
			lamp: number
			state: TallyActionState
			mode: TallySetMode
		}
	}
	sync_program_preview: {
		options: {
			programInput: number
			previewInput: number
			transitionActive: boolean
		}
	}
	clear_all: {
		options: Record<string, never>
	}
}

const stateChoices = [
	{ id: 'off', label: 'Off' },
	{ id: 'preview', label: 'Preview (green)' },
	{ id: 'program', label: 'Program (red)' },
	{ id: 'both', label: 'Preview + Program' },
	{ id: 'clear_preview', label: 'Clear Preview only' },
	{ id: 'clear_program', label: 'Clear Program only' },
]

const modeChoices = [
	{ id: 'exclusive', label: 'Exclusive' },
	{ id: 'additive', label: 'Additive / transition' },
]

export function UpdateActions(self: ModuleInstance): void {
	self.setActionDefinitions({
		set_lamp: {
			name: 'Set lamp state',
			options: [
				{
					id: 'lamp',
					type: 'number',
					label: 'Lamp',
					default: 1,
					min: 1,
					max: 12,
				},
				{
					id: 'state',
					type: 'dropdown',
					label: 'State',
					default: 'program',
					choices: stateChoices,
				},
				{
					id: 'mode',
					type: 'dropdown',
					label: 'Mode',
					default: 'exclusive',
					choices: modeChoices,
				},
			],
			callback: async (event) => {
				await self.setLamp(Number(event.options.lamp), event.options.state, event.options.mode)
			},
		},
		sync_program_preview: {
			name: 'Sync all lamps from Program/Preview variables',
			description:
				'Set all lamps from switcher Program/Preview input IDs. Use expressions such as $(atem:pgm1_input_id), $(atem:pvw1_input_id), and $(atem:tbar_1) > 0.',
			options: [
				{
					id: 'programInput',
					type: 'number',
					label: 'Program input ID',
					default: 1,
					min: 0,
					max: 9999,
					asInteger: true,
					allowInvalidValues: true,
					expressionDescription: 'Use an expression such as $(atem:pgm1_input_id).',
				},
				{
					id: 'previewInput',
					type: 'number',
					label: 'Preview input ID',
					default: 2,
					min: 0,
					max: 9999,
					asInteger: true,
					allowInvalidValues: true,
					expressionDescription: 'Use an expression such as $(atem:pvw1_input_id).',
				},
				{
					id: 'transitionActive',
					type: 'checkbox',
					label: 'Transition active',
					default: false,
					allowInvalidValues: true,
					expressionDescription: 'Use an expression such as $(atem:tbar_1) > 0.',
				},
			],
			callback: async (event) => {
				await self.syncProgramPreviewInputs(
					event.options.programInput,
					event.options.previewInput,
					event.options.transitionActive,
				)
			},
		},
		clear_all: {
			name: 'Clear all lamps',
			options: [],
			callback: async () => {
				await self.clearAllLamps()
			},
		},
	})
}
