import type ModuleInstance from './main.js'
import type { TallyState } from './ts3019.js'

export type FeedbacksSchema = {
	lamp_state: {
		type: 'boolean'
		options: {
			lamp: number
			state: TallyState
		}
	}
}

const stateChoices = [
	{ id: 'off', label: 'Off' },
	{ id: 'preview', label: 'Preview' },
	{ id: 'program', label: 'Program' },
	{ id: 'both', label: 'Preview + Program' },
]

export function UpdateFeedbacks(self: ModuleInstance): void {
	self.setFeedbackDefinitions({
		lamp_state: {
			name: 'Lamp is in state',
			type: 'boolean',
			defaultStyle: {
				bgcolor: 0xff0000,
				color: 0xffffff,
			},
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
			],
			callback: (feedback) => {
				return self.getLampState(Number(feedback.options.lamp)) === feedback.options.state
			},
		},
	})
}
