import dgram from 'dgram'
import { Packet } from './packet.js'
import { SACN_DMX_START_CODE } from './dmp.js'
import { calculateMulticastAddress } from './utils.js'
import { SourceManager } from './sourceManager.js'

export const SACN_DEFAULT_PORT = 5568

interface SACNPayload {
	slots: number[]
	sourceName: string
	sourceUUID: string
	priority: string
	fps: string
	packetsPerSecond: number
	timestamp: number
	activeSources?: { name: string; uuid: string; priority: number; fps: number }[]
}

class SACNReceiver {
	port: number
	universe: number
	localAddress: string | undefined
	listeners: Set<(data: SACNPayload) => void>
	packetCount: number
	lastCounterReset: number
	checkTimer: NodeJS.Timeout | null
	multicastAddress: string
	socket: dgram.Socket
	private sourceManager: SourceManager

	constructor(options: { universe?: number; port?: number; localAddress?: string }) {
		this.port = options.port ?? SACN_DEFAULT_PORT
		this.universe = options.universe ?? 1
		this.localAddress = options.localAddress ?? undefined
		this.sourceManager = new SourceManager(512, 2500) // 512 slots, 2.5s timeout

		this.listeners = new Set<(data: SACNPayload) => void>()
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

		// Create check timer for packet inactivity and source cleanup
		this.checkTimer = setInterval(() => {
			const now = Date.now()

			// Clean up stale sources
			const removedSources = this.sourceManager.removeStaleSourcesAndUpdate(now)
			if (removedSources.length > 0) {
				this.notifyListeners(now)
			}

			// Reset packet counter
			const timeSinceReset = now - this.lastCounterReset
			if (timeSinceReset >= 1000) {
				this.packetCount = 0
				this.lastCounterReset = now
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

			const now = Date.now()
			const sourceName = sacnPacket.frame.getSourceName()
			const sourceUUID = sacnPacket.getUUID()
			const portPriority = sacnPacket.frame.getPriority()
			const slots = sacnPacket.getSlots()

			// Determine packet type by start code
			const startCode = sacnPacket.dmp.getStartCode()

			if (startCode === SACN_DMX_START_CODE.PRIORITY) {
				// This is a per-address priority packet (0xdd)
				this.sourceManager.updateSource(
					sourceUUID,
					sourceName,
					portPriority,
					Buffer.alloc(0), // No DMX data in priority packet
					now,
					slots, // Priority values
				)
			} else if (startCode === SACN_DMX_START_CODE.NULL) {
				// This is a regular DMX data packet (0x00)
				this.sourceManager.updateSource(sourceUUID, sourceName, portPriority, slots, now)
			}

			// Update packets per second counter
			this.packetCount++

			// Notify listeners of the update
			this.notifyListeners(now)
		} catch (err) {
			console.error('Error processing sACN packet:', err)
		}
	}

	private notifyListeners(timestamp: number): void {
		const mergedSlots = this.sourceManager.getMergedOutput()
		const activeSources = this.sourceManager.getActiveSources()

		// Calculate packets per second
		const timeSinceReset = timestamp - this.lastCounterReset
		const packetsPerSecond = timeSinceReset > 0 ? Math.round((this.packetCount * 1000) / timeSinceReset) : 0

		// Create payload with merged data
		const payload: SACNPayload = {
			slots: Array.from(mergedSlots), // Convert Buffer to number[]
			sourceName: activeSources.length > 0 ? JSON.stringify(activeSources.map((source) => source.name)) : '',
			sourceUUID: activeSources.length > 0 ? JSON.stringify(activeSources.map((source) => source.uuid)) : '',
			priority: activeSources.length > 0 ? JSON.stringify(activeSources.map((source) => source.priority)) : '0',
			fps: activeSources.length > 0 ? JSON.stringify(activeSources.map((source) => source.fps)) : '0',
			packetsPerSecond,
			timestamp,
			activeSources,
		}

		// Notify all listeners
		this.listeners.forEach((listener) => {
			listener(payload)
		})
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
