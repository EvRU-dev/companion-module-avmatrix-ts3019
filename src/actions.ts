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
		clear_all: {
			name: 'Clear all lamps',
			options: [],
			callback: async () => {
				await self.clearAllLamps()
			},
		},
	})
}
