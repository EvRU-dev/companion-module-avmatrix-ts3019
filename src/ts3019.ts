type SerialPortClass = typeof import('serialport').SerialPort
type SerialPortInstance = InstanceType<SerialPortClass>

export type TallyState = 'off' | 'preview' | 'program' | 'both'

export type LampStatus = {
	preview: boolean
	program: boolean
}

export type SerialDeviceInfo = {
	path: string
	manufacturer?: string
	vendorId?: string
	productId?: string
}

const PIN_MODE = 0xf4
const DIGITAL_MESSAGE = 0x90
const OUTPUT = 0x01

export class Ts3019Connection {
	private port?: SerialPortInstance
	private portStates = new Map<number, number>()
	private lampStates: LampStatus[] = []

	constructor(
		private readonly log: (level: 'debug' | 'info' | 'warn' | 'error', message: string) => void,
		private readonly onDisconnect: (message: string) => void,
	) {}

	get isOpen(): boolean {
		return this.port?.isOpen === true
	}

	async connect(path: string, baudRate: number, lampCount: number, firstPreviewPin: number): Promise<void> {
		await this.close()

		this.portStates.clear()
		this.lampStates = Array.from({ length: lampCount }, () => ({ preview: false, program: false }))

		const SerialPort = await loadSerialPort()
		this.port = new SerialPort({
			path,
			baudRate,
			autoOpen: false,
		})

		this.port.on('error', (error) => {
			this.log('error', `Serial error: ${error.message}`)
		})

		this.port.on('close', () => {
			this.onDisconnect('Serial port closed')
		})

		await new Promise<void>((resolve, reject) => {
			this.port?.open((error) => {
				if (error) reject(error)
				else resolve()
			})
		})

		await this.wait(2000)
		for (let lamp = 1; lamp <= lampCount; lamp++) {
			const pins = this.getLampPins(lamp, firstPreviewPin)
			await this.setPinMode(pins.previewPin, OUTPUT)
			await this.setPinMode(pins.programPin, OUTPUT)
		}

		await this.clearAll(lampCount, firstPreviewPin)
	}

	async close(): Promise<void> {
		if (!this.port) return

		const port = this.port
		this.port = undefined

		if (!port.isOpen) return

		await new Promise<void>((resolve) => {
			port.close(() => resolve())
		})
	}

	async setLamp(lamp: number, state: TallyState, firstPreviewPin: number): Promise<LampStatus> {
		const pins = this.getLampPins(lamp, firstPreviewPin)
		const preview = state === 'preview' || state === 'both'
		const program = state === 'program' || state === 'both'
		const outputPreview = preview && !program

		await this.writeDigitalPin(pins.previewPin, outputPreview)
		await this.writeDigitalPin(pins.programPin, program)

		this.lampStates[lamp - 1] = { preview, program }
		return this.lampStates[lamp - 1]
	}

	async clearAll(lampCount: number, firstPreviewPin: number): Promise<void> {
		for (let lamp = 1; lamp <= lampCount; lamp++) {
			await this.setLamp(lamp, 'off', firstPreviewPin)
		}
	}

	getLampState(lamp: number): LampStatus {
		return this.lampStates[lamp - 1] ?? { preview: false, program: false }
	}

	private getLampPins(lamp: number, firstPreviewPin: number): { previewPin: number; programPin: number } {
		const previewPin = firstPreviewPin + (lamp - 1) * 2
		return {
			previewPin,
			programPin: previewPin + 1,
		}
	}

	private async setPinMode(pin: number, mode: number): Promise<void> {
		await this.write(Buffer.from([PIN_MODE, pin, mode]))
	}

	private async writeDigitalPin(pin: number, enabled: boolean): Promise<void> {
		const portNumber = Math.floor(pin / 8)
		const bit = pin % 8
		const current = this.portStates.get(portNumber) ?? 0
		const next = enabled ? current | (1 << bit) : current & ~(1 << bit)

		this.portStates.set(portNumber, next)
		await this.write(Buffer.from([DIGITAL_MESSAGE | portNumber, next & 0x7f, (next >> 7) & 0x7f]))
	}

	private async write(bytes: Buffer): Promise<void> {
		if (!this.port?.isOpen) throw new Error('Serial port is not open')

		await new Promise<void>((resolve, reject) => {
			this.port?.write(bytes, (error) => {
				if (error) reject(error)
				else this.port?.drain((drainError) => (drainError ? reject(drainError) : resolve()))
			})
		})
	}

	private async wait(ms: number): Promise<void> {
		await new Promise((resolve) => setTimeout(resolve, ms))
	}
}

export async function findTs3019Port(preferredPath?: string): Promise<SerialDeviceInfo | undefined> {
	const SerialPort = await loadSerialPort()
	const ports = await SerialPort.list()
	const normalizedPreferredPath = preferredPath?.trim()

	if (normalizedPreferredPath && normalizedPreferredPath.toLowerCase() !== 'auto') {
		const preferred = ports.find((port) => port.path === normalizedPreferredPath)
		if (preferred) return preferred
	}

	return (
		ports.find((port) => port.vendorId?.toLowerCase() === '1a86' && port.productId?.toLowerCase() === '7523') ??
		ports.find((port) => /ch340|ch341|qinheng/i.test(`${port.manufacturer ?? ''} ${port.path}`)) ??
		ports.find((port) => /ttyUSB|ttyACM|usbserial|usbmodem|^COM\d+$/i.test(port.path))
	)
}

async function loadSerialPort(): Promise<SerialPortClass> {
	const { SerialPort } = await import('serialport')
	return SerialPort
}
