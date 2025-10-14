import { combineRgb, Regex } from '@companion-module/base'
import type { SACNInstance } from './main.js'

export function UpdateFeedbacks(self: SACNInstance): void {
	self.setFeedbackDefinitions({
		chan_matches_value: {
			type: 'boolean',
			name: 'When channel is matches a value',
			description: "Changes the button's style when the value matches is pending.",
			defaultStyle: {
				bgcolor: combineRgb(204, 102, 0),
				color: combineRgb(255, 255, 255),
			},
			options: [
				{
					id: 'channel',
					type: 'textinput',
					label: 'Channel',
					default: '1',
					regex: Regex.NUMBER,
				},
				{
					id: 'value',
					type: 'textinput',
					label: 'Value',
					default: '1',
					regex: Regex.FLOAT_OR_INT,
				},
			],
			callback: (feedback) => {
				return (
					feedback.options.value === self.getVariableValue(`value_chan_${feedback.options.channel}`)
					// TODO
				)
			},
		},
	})
}
