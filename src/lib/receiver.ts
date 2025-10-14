import dgram from 'dgram'
import { Packet } from './packet.js'
import { calculateMulticastAddress } from './utils.js'

export const SACN_DEFAULT_PORT = 5568

interface SACNPayload {
	slots: number[]
	sourceName: string
	sourceUUID: string
	priority: number
	fps: number
	packetsPerSecond: number
	timestamp: number
}

class SACNReceiver {
	port: number
	universe: number
	localAddress: string | undefined
	listeners: Set<(data: SACNPayload) => void>
	lastSourceName: string
	lastSourceUUID: string
	lastPacketTime: number
	fps: number
	lastPriority: number
	packetsPerSecond: number
	packetCount: number
	lastCounterReset: number
	checkTimer: NodeJS.Timeout | null
	multicastAddress: string
	socket: dgram.Socket

	constructor(options: { universe?: number; port?: number; localAddress?: string }) {
		this.port = options.port ?? SACN_DEFAULT_PORT
		this.universe = options.universe ?? 1
		this.localAddress = options.localAddress ?? undefined

		this.listeners = new Set<(data: SACNPayload) => void>()
		this.lastSourceName = ''
		this.lastSourceUUID = ''
		this.lastPacketTime = 0
		this.fps = 0
		this.lastPriority = 0
		this.packetsPerSecond = 0
		this.packetCount = 0
		this.lastCounterReset = Date.now()
		this.checkTimer = null

		// Calculate multicast address for the universe
		this.multicastAddress = calculateMulticastAddress(this.universe)

		// Create UDP socket
		this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true })

		// Setup socket event handlers
		this.socket.on('message', (msg) => this._handleIncomingPacket(msg))
		this.socket.on('error', (err) => console.error('sACN Receiver error:', err))

		// Bind socket and join multicast group
		this.socket.bind(this.port, () => {
			this.socket.setBroadcast(true)
			this.socket.setMulticastTTL(1)
			if (this.localAddress) {
				this.socket.setMulticastInterface(this.localAddress)
			}
			this.socket.addMembership(this.multicastAddress, this.localAddress)
			console.log(
				`Listening on ${this.multicastAddress}:${this.port} on ${this.localAddress} for Universe ${this.universe}`,
			)
		})

		// Create check timer for packet inactivity
		this.checkTimer = setInterval(() => {
			const now = Date.now()
			const timeSinceLastPacket = now - this.lastPacketTime

			// If no packets received in last second, reset counters
			if (timeSinceLastPacket >= 1000) {
				this.packetsPerSecond = 0
				this.packetCount = 0
				this.fps = 0

				// Notify listeners of the update
				this.listeners.forEach((listener) => {
					listener({
						slots: [],
						sourceName: this.lastSourceName,
						sourceUUID: this.lastSourceUUID,
						priority: this.lastPriority,
						fps: this.fps,
						packetsPerSecond: this.packetsPerSecond,
						timestamp: now,
					})
				})
			}
		}, 1000)
	}

	private _handleIncomingPacket(data: Buffer): void {
		try {
			// Create new packet
			const sacnPacket = new Packet(data)

			// Validate packet
			if (!sacnPacket.validate()) {
				return // Invalid packet
			}

			// Update timing info
			const now = Date.now()
			if (this.lastPacketTime) {
				const timeDiff = now - this.lastPacketTime
				if (timeDiff > 0) {
					this.fps = Math.round(1000 / timeDiff)
				}
			}
			this.lastPacketTime = now

			// Update packets per second counter
			this.packetCount++
			const timeSinceReset = now - this.lastCounterReset
			if (timeSinceReset >= 1000) {
				this.packetsPerSecond = Math.round((this.packetCount * 1000) / timeSinceReset)
				this.packetCount = 0
				this.lastCounterReset = now
			}

			// Update source information
			this.lastSourceName = sacnPacket.frame.getSourceName()
			this.lastSourceUUID = sacnPacket.getUUID()
			this.lastPriority = sacnPacket.frame.getPriority()

			// Get DMX data
			const slots = sacnPacket.getSlots()

			// Notify all listeners
			this.listeners.forEach((listener) => {
				listener({
					slots,
					sourceName: this.lastSourceName,
					sourceUUID: this.lastSourceUUID,
					priority: this.lastPriority,
					fps: this.fps,
					packetsPerSecond: this.packetsPerSecond,
					timestamp: now,
				})
			})
		} catch (err) {
			console.error('Error processing sACN packet:', err)
		}
	}

	public addListener(callback: (data: SACNPayload) => void): void {
		this.listeners.add(callback)
	}

	public removeListener(callback: (data: SACNPayload) => void): void {
		this.listeners.delete(callback)
	}

	public close(): void {
		if (this.checkTimer) {
			clearInterval(this.checkTimer)
			this.checkTimer = null
		}
		this.socket.close()
		this.listeners.clear()
	}
}

export { SACNReceiver }

// Example usage:
/*
const receiver = new SACNReceiver({
    universe: 1,
    port: 5568,
    localAddress: '192.168.1.100'
});

receiver.addListener((data) => {
    console.log('Received packet:', data);
});
*/
