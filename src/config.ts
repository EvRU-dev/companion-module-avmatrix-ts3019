import { type SomeCompanionConfigField } from '@companion-module/base'

export type ModuleConfig = {
	portPath: string
	baudRate: number
	lampCount: number
	firstPreviewPin: number
	reconnectInterval: number
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'textinput',
			id: 'portPath',
			label: 'Serial device',
			width: 8,
			default: 'auto',
		},
		{
			type: 'number',
			id: 'baudRate',
			label: 'Baud rate',
			width: 4,
			min: 1200,
			max: 115200,
			default: 57600,
		},
		{
			type: 'number',
			id: 'lampCount',
			label: 'Number of lamps',
			width: 4,
			min: 1,
			max: 12,
			default: 12,
		},
		{
			type: 'number',
			id: 'firstPreviewPin',
			label: 'First preview pin',
			width: 4,
			min: 0,
			max: 127,
			default: 2,
		},
		{
			type: 'number',
			id: 'reconnectInterval',
			label: 'Reconnect interval (ms)',
			width: 4,
			min: 0,
			max: 60000,
			default: 15000,
		},
	]
}
