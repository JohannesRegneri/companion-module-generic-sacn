// Calculate the multicast address for a given universe
export function calculateMulticastAddress(universe: number): string {
	if (universe < 1 || universe > 63999) {
		throw new Error('Universe must be between 1 and 63999')
	}

	const high = Math.floor(universe / 256)
	const low = universe % 256
	const address = `239.255.${high}.${low}`
	//console.log('calculateMulticastAddress U: ' + universe + ' IP: ' + address )
	return address
}

export function parseRange(input: string, length: number): boolean[] {
	let result = []
	if (input) {
		for (let i = 0; i < length; i++) {
			result[i] = false
		}

		const parts = input.split(',')
		parts.forEach((part) => {
			//console.log(part)
			if (Number(part)) {
				// single number
				;(result ??= [])[Number(part) - 1] = true
			} else {
				// some range <start>-<stop>
				const p = part.split('-')
				for (let i = Number(p[0]) - 1; i < Number(p[1]); i++) {
					;(result ??= [])[i] = true
				}
			}
		})
	}
	return result
}
