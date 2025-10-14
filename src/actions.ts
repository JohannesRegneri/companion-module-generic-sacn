import { Regex } from '@companion-module/base'
import type { SACNInstance } from './main.js'

export function UpdateActions(self: SACNInstance): void {
	self.setActionDefinitions({
		setValue: {
			name: 'Set/Fade Value',
			options: [
				{
					type: 'textinput',
					label: 'Fade duration (ms)',
					id: 'duration',
					regex: Regex.NUMBER,
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Channel (1-512)',
					id: 'channel',
					regex: Regex.NUMBER,
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Value (0-255)',
					id: 'value',
					regex: Regex.NUMBER,
					useVariables: true,
				},
			],
			callback: (action) => {
				if (self.transitions) {
					self.transitions.run(
						Number(action.options.channel) - 1,
						Number(action.options.value),
						Number(action.options.duration) || 0,
					)
				}
			},
		},
		fadeValues: {
			name: 'Set/Fade To Values',
			options: [
				{
					type: 'textinput',
					label: 'Fade duration (ms)',
					id: 'duration',
					regex: Regex.NUMBER,
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Starting Channel (1-512)',
					id: 'start',
					regex: Regex.NUMBER,
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Values (space-separated list)',
					id: 'values',
					regex: '/((^| )([1-9]?[0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])){1,512}$/',
					default: '0 1 255',
					useVariables: true,
				},
			],
			callback: async (action) => {
				const valuesRaw = await self.parseVariablesInString(String(action.options.values))
				const values = valuesRaw.split(' ')
				for (let i = 0; i < values.length; i++) {
					if (self.transitions) {
						self.transitions.run(
							i + (Number(action.options.start) - 1),
							Number(values[i]),
							Number(action.options.duration) || 0,
						)
					}
				}
			},
		},
	})
}
