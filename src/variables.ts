import type { CompanionVariableDefinitions } from '@companion-module/base'
import type ModuleInstance from './main.js'

export type VariablesSchema = {
	connected: string
} & Record<`lamp_${number}_state`, string>

export function UpdateVariableDefinitions(self: ModuleInstance): void {
	const definitions: CompanionVariableDefinitions<VariablesSchema> = {
		connected: { name: 'Serial connection is open' },
	}

	for (let lamp = 1; lamp <= 12; lamp++) {
		definitions[`lamp_${lamp}_state`] = { name: `Lamp ${lamp} state` }
	}

	self.setVariableDefinitions(definitions)
}
