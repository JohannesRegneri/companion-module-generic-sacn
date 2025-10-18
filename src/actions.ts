import type { SACNInstance } from './main.js'

export function UpdateActions(self: SACNInstance): void {
	self.setActionDefinitions({
		setValue: {
			name: 'Set/Fade Value (single)',
			description: 'Set/Fade the output of one channel',
			options: [
				{
					type: 'textinput',
					label: 'Fade duration (ms)',
					id: 'duration',
					default: '1',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Channel (1-512)',
					id: 'channel',
					default: '1',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Value (0-255)',
					id: 'value',
					default: '0',
					useVariables: true,
				},
			],
			callback: async (action) => {
				const [channel, val, duration] = await Promise.all([
					self.parseVariablesInString(String(action.options.channel)),
					self.parseVariablesInString(String(action.options.value)),
					self.parseVariablesInString(String(action.options.duration)),
				])
				self.transitions?.run(Number(channel), Number(val), Number(duration))
			},
		},
		fadeValues: {
			name: 'Set/Fade Values (multiple)',
			description: 'Set/Fade the output of multiple channels',
			options: [
				{
					type: 'textinput',
					label: 'Fade duration (ms)',
					id: 'duration',
					default: '0',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Starting Channel (1-512)',
					id: 'start',
					default: '1',
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
				const [valuesRaw, start, duration] = await Promise.all([
					self.parseVariablesInString(String(action.options.values)),
					self.parseVariablesInString(String(action.options.start)),
					self.parseVariablesInString(String(action.options.duration)),
				])
				const values = valuesRaw.split(' ')
				for (let i = 0; i < values.length; i++) {
					self.transitions?.run(i + Number(start), Number(values[i]), Number(duration))
				}
			},
		},
		offset_single: {
			name: 'Offset Value (single)',
			description: 'Change the output of one channels with + or -',
			options: [
				{
					type: 'textinput',
					label: 'Fade duration (ms)',
					id: 'duration',
					default: '0',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Channel',
					id: 'channel',
					default: '1',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: `Value change + or -`,
					id: 'value',
					default: '1',
					useVariables: true,
				},
			],
			callback: async (action) => {
				const [channel, val, duration] = await Promise.all([
					self.parseVariablesInString(String(action.options.channel)),
					self.parseVariablesInString(String(action.options.value)),
					self.parseVariablesInString(String(action.options.duration)),
				])

				const newval = Math.min(255, Math.max(0, self.data[Number(channel) - 1] + Number(val)))

				self.transitions?.run(Number(channel), Number(newval), Number(duration))
			},
		},
		offset_multiple: {
			name: 'Offset Value (multiple)',
			description: 'Change the output of multiple channels with + or -',
			options: [
				{
					type: 'textinput',
					label: 'Fade duration (ms)',
					id: 'duration',
					default: '0',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Starting Channel (1-512)',
					id: 'start',
					default: '1',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Values to change + or - (space-separated list) ',
					id: 'values',
					regex: '/((^| )([1-9]?[0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])){1,512}$/',
					default: '0 1 255',
					useVariables: true,
				},
			],
			callback: async (action) => {
				const [start, valuesRaw, duration] = await Promise.all([
					self.parseVariablesInString(String(action.options.start)),
					self.parseVariablesInString(String(action.options.values)),
					self.parseVariablesInString(String(action.options.duration)),
				])
				const values = valuesRaw.split(' ')
				for (let i = 0; i < values.length; i++) {
					const newval = Math.min(255, Math.max(0, self.data[i + (Number(start) - 1)] + Number(values[i])))

					self.transitions?.run(i + Number(start), Number(newval), Number(duration))
				}
			},
		},
	})
}
