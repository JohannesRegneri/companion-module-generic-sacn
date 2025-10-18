class Transitions {
	transitions = new Map()

	tickInterval: NodeJS.Timeout | undefined = undefined
	data: number[]
	tickMs: number
	sendFcn: () => void

	constructor(data: number[], tickMs: number, sendFcn: () => void) {
		this.data = data
		this.tickMs = tickMs
		this.sendFcn = sendFcn
	}

	isRunning(): boolean {
		return this.transitions.size > 0
	}

	stopAll(): void {
		this.transitions.clear()

		if (this.tickInterval) {
			clearInterval(this.tickInterval)
			delete this.tickInterval
		}
	}

	runTick(): void {
		const completedChannels = []
		for (const [channel, info] of this.transitions.entries()) {
			const newValue = info.steps.shift()
			if (newValue !== undefined) {
				this.data[channel] = newValue
			}
			if (info.steps.length === 0) {
				completedChannels.push(channel)
			}
		}

		// Remove any completed transitions
		for (const path of completedChannels) {
			this.transitions.delete(path)
		}
		// If nothing is left, stop the timer
		if (this.transitions.size === 0) {
			this.stopAll()
		}

		this.sendFcn()
	}

	run(channel: number, to: number, duration: number): void {
		const from = this.data[channel - 1]
		//console.debug(`Run fade on "${channel}" from "${from}" to "${to}" over "${duration}"ms`)
		if (from === undefined) {
			// Not a valid channel, so ignore
			return
		}

		const stepCount = Math.ceil((duration || 0) / this.tickMs)

		if (stepCount <= 1) {
			// this.transitions.delete(channel)
			// this.data[channel] = to
			// Force a single step for the next tick
			this.transitions.set(channel - 1, {
				steps: [to],
			})
		} else {
			const diff = to - from
			const steps = []
			const easing = (v: number) => v // aka Easing.Linear.None // TODO - dynamic
			for (let i = 1; i <= stepCount; i++) {
				const fraction = easing(i / stepCount)
				steps.push(from + diff * fraction)
			}

			this.transitions.set(channel - 1, {
				steps,
			})
		}

		if (!this.tickInterval) {
			// Start the tick if not already running
			this.tickInterval = setInterval(() => this.runTick(), this.tickMs)
		}
	}
}

export { Transitions }
