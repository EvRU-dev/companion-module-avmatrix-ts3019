import { InstanceBase, InstanceStatus, type SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpdateVariableDefinitions, type VariablesSchema } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions, type ActionsSchema, type TallyActionState, type TallySetMode } from './actions.js'
import { UpdateFeedbacks, type FeedbacksSchema } from './feedbacks.js'
import { UpdatePresets } from './presets.js'
import { findTs3019Port, Ts3019Connection, type TallyState } from './ts3019.js'
import { Atem } from 'atem-connection'

const MAX_LAMPS = 12

export type ModuleSchema = {
	config: ModuleConfig
	secrets: undefined
	actions: ActionsSchema
	feedbacks: FeedbacksSchema
	variables: VariablesSchema
}

export { UpgradeScripts }

export default class ModuleInstance extends InstanceBase<ModuleSchema> {
	config!: ModuleConfig // Setup in init()
	private connection?: Ts3019Connection
	private atem?: Atem
	private reconnectTimer?: NodeJS.Timeout
	private atemReconnectTimer?: NodeJS.Timeout
	private atemSyncTimer?: NodeJS.Timeout
	private atemPollTimer?: NodeJS.Timeout
	private atemConnected = false

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = config

		this.updateStatus(InstanceStatus.Connecting)

		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updatePresets() // export Presets
		this.updateVariableDefinitions() // export variable definitions
		this.updateVariables()

		await this.openConnection()
		this.setupAtemSync()
	}
	// When module gets deleted
	async destroy(): Promise<void> {
		this.log('debug', 'destroy')
		this.stopReconnectTimer()
		this.stopAtemSync()
		await this.connection?.close()
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.config = config
		this.updateVariables()
		await this.openConnection()
		this.setupAtemSync()
	}

	// Return config fields for web config
	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	updateActions(): void {
		UpdateActions(this)
	}

	updateFeedbacks(): void {
		UpdateFeedbacks(this)
	}

	updatePresets(): void {
		UpdatePresets(this)
	}

	updateVariableDefinitions(): void {
		UpdateVariableDefinitions(this)
	}

	async setLamp(lamp: number, state: TallyActionState, mode: TallySetMode = 'exclusive'): Promise<void> {
		if (!this.connection?.isOpen) throw new Error('TS3019 is not connected')

		const firstPreviewPin = Number(this.config.firstPreviewPin ?? 2)
		const targetState = this.mergeTargetState(this.connection.getLampState(lamp), state)
		const wantsPreview = targetState === 'preview' || targetState === 'both'
		const wantsProgram = targetState === 'program' || targetState === 'both'

		if (mode === 'exclusive' && (wantsPreview || wantsProgram)) {
			for (let otherLamp = 1; otherLamp <= this.getLampCount(); otherLamp++) {
				if (otherLamp === lamp) continue

				const current = this.connection.getLampState(otherLamp)
				const next = {
					preview: wantsPreview ? false : current.preview,
					program: wantsProgram ? false : current.program,
				}

				if (current.preview !== next.preview || current.program !== next.program) {
					await this.connection.setLamp(otherLamp, this.lampStatusToTallyState(next), firstPreviewPin)
				}
			}
		}

		await this.connection.setLamp(lamp, targetState, firstPreviewPin)
		this.updateVariables()
		this.checkFeedbacks('lamp_state')
	}

	async clearAllLamps(): Promise<void> {
		if (!this.connection?.isOpen) throw new Error('TS3019 is not connected')

		await this.connection.clearAll(this.getLampCount(), Number(this.config.firstPreviewPin ?? 2))
		this.updateVariables()
		this.checkFeedbacks('lamp_state')
	}

	async syncFromAtemState(): Promise<void> {
		if (!this.connection?.isOpen) return
		if (!this.config.atemSyncEnabled || !this.atemConnected) return

		const meIndex = Math.max(0, Number(this.config.atemMixEffect || 1) - 1)
		const state = this.atem?.state
		const me = state?.video?.mixEffects?.[meIndex]
		if (!me) return

		const programInput = Number(me.programInput)
		const previewInput = Number(me.previewInput)
		const inTransition = !!me.transitionPosition?.inTransition
		const firstPreviewPin = Number(this.config.firstPreviewPin ?? 2)

		for (let lamp = 1; lamp <= this.getLampCount(); lamp++) {
			const wantsProgram = programInput === lamp || (inTransition && previewInput === lamp)
			const wantsPreview = previewInput === lamp
			const nextState = this.lampStatusToTallyState({ preview: wantsPreview, program: wantsProgram })
			if (this.getLampState(lamp) !== nextState) {
				await this.connection.setLamp(lamp, nextState, firstPreviewPin)
			}
		}

		this.updateVariables()
		this.checkFeedbacks('lamp_state')
	}

	getLampState(lamp: number): TallyState {
		const state = this.connection?.getLampState(lamp)
		if (!state) return 'off'
		return this.lampStatusToTallyState(state)
	}

	private lampStatusToTallyState(state: { preview: boolean; program: boolean }): TallyState {
		if (state.preview && state.program) return 'both'
		if (state.program) return 'program'
		if (state.preview) return 'preview'
		return 'off'
	}

	private mergeTargetState(current: { preview: boolean; program: boolean }, requested: TallyActionState): TallyState {
		if (requested === 'off' || requested === 'both') return requested
		if (requested === 'clear_preview') {
			return this.lampStatusToTallyState({ preview: false, program: current.program })
		}
		if (requested === 'clear_program') {
			return this.lampStatusToTallyState({ preview: current.preview, program: false })
		}

		return this.lampStatusToTallyState({
			preview: current.preview || requested === 'preview',
			program: current.program || requested === 'program',
		})
	}

	private async openConnection(): Promise<void> {
		this.stopReconnectTimer()
		await this.connection?.close()

		const portPath = await this.resolvePortPath(this.config.portPath || 'auto')
		const baudRate = Number(this.config.baudRate || 57600)

		this.connection = new Ts3019Connection(
			(level, message) => this.log(level, message),
			(message) => {
				this.updateStatus(InstanceStatus.Disconnected, message)
				this.scheduleReconnect()
			},
		)

		try {
			this.updateStatus(InstanceStatus.Connecting, `Opening ${portPath}`)
			await this.connection.connect(portPath, baudRate, this.getLampCount(), Number(this.config.firstPreviewPin ?? 2))
			this.updateStatus(InstanceStatus.Ok)
			this.updateVariables()
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			this.updateStatus(InstanceStatus.ConnectionFailure, message)
			this.log('warn', `Could not open ${portPath}: ${message}`)
			this.scheduleReconnect()
		}
	}

	private scheduleReconnect(): void {
		this.stopReconnectTimer()

		const interval = Number(this.config.reconnectInterval ?? 5000)
		if (interval <= 0) return

		this.reconnectTimer = setTimeout(() => {
			void this.openConnection()
		}, interval)
	}

	private stopReconnectTimer(): void {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer)
			this.reconnectTimer = undefined
		}
	}

	private setupAtemSync(): void {
		this.stopAtemSync()

		if (!this.config.atemSyncEnabled) return

		const host = String(this.config.atemHost || '').trim()
		if (!host) {
			this.log('warn', 'ATEM sync is enabled, but no ATEM IP address is configured')
			return
		}

		this.atem = new Atem()
		this.atem.on('connected', () => {
			this.atemConnected = true
			this.log('info', `Connected to ATEM for direct tally sync at ${host}`)
			this.startAtemPollTimer()
			this.scheduleAtemStateSync()
		})
		this.atem.on('disconnected', () => {
			this.atemConnected = false
			this.stopAtemPollTimer()
			this.log('warn', 'ATEM direct tally sync disconnected')
			this.scheduleAtemReconnect()
		})
		this.atem.on('stateChanged', (_state, paths) => {
			const meIndex = Math.max(0, Number(this.config.atemMixEffect || 1) - 1)
			const prefix = `video.mixEffects.${meIndex}.`
			if (
				paths.some(
					(path) =>
						path.startsWith(`${prefix}programInput`) ||
						path.startsWith(`${prefix}previewInput`) ||
						path.startsWith(`${prefix}transitionPosition`),
				)
			) {
				this.scheduleAtemStateSync()
			}
		})
		this.atem.on('error', (error: unknown) => {
			const message = error instanceof Error ? error.message : String(error)
			this.log('warn', `ATEM direct tally sync error: ${message}`)
		})

		void this.connectAtem()
	}

	private stopAtemSync(): void {
		this.stopAtemReconnectTimer()
		this.stopAtemSyncTimer()
		this.stopAtemPollTimer()
		this.atemConnected = false

		const atem = this.atem
		this.atem = undefined
		if (atem) {
			atem.removeAllListeners()
			void atem.disconnect().catch(() => undefined)
		}
	}

	private async connectAtem(): Promise<void> {
		const host = String(this.config.atemHost || '').trim()
		if (!this.atem || !host || !this.config.atemSyncEnabled) return

		try {
			this.log('info', `Connecting to ATEM for direct tally sync at ${host}`)
			await this.atem.connect(host)
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			this.log('warn', `Could not connect to ATEM ${host}: ${message}`)
			this.scheduleAtemReconnect()
		}
	}

	private scheduleAtemReconnect(): void {
		this.stopAtemReconnectTimer()

		const interval = Number(this.config.atemReconnectInterval ?? 5000)
		if (interval <= 0 || !this.config.atemSyncEnabled) return

		this.atemReconnectTimer = setTimeout(() => {
			void this.connectAtem()
		}, interval)
	}

	private stopAtemReconnectTimer(): void {
		if (this.atemReconnectTimer) {
			clearTimeout(this.atemReconnectTimer)
			this.atemReconnectTimer = undefined
		}
	}

	private scheduleAtemStateSync(): void {
		this.stopAtemSyncTimer()
		this.atemSyncTimer = setTimeout(() => {
			void this.syncFromAtemState().catch((error) => {
				const message = error instanceof Error ? error.message : String(error)
				this.log('warn', `ATEM tally sync failed: ${message}`)
			})
		}, 20)
	}

	private stopAtemSyncTimer(): void {
		if (this.atemSyncTimer) {
			clearTimeout(this.atemSyncTimer)
			this.atemSyncTimer = undefined
		}
	}

	private startAtemPollTimer(): void {
		this.stopAtemPollTimer()
		this.atemPollTimer = setInterval(() => {
			this.scheduleAtemStateSync()
		}, 250)
	}

	private stopAtemPollTimer(): void {
		if (this.atemPollTimer) {
			clearInterval(this.atemPollTimer)
			this.atemPollTimer = undefined
		}
	}

	private getLampCount(): number {
		return Math.max(1, Math.min(MAX_LAMPS, Number(this.config.lampCount || MAX_LAMPS)))
	}

	private async resolvePortPath(configuredPath: string): Promise<string> {
		const configured = configuredPath.trim()
		const device = await findTs3019Port(configured)

		if (device?.path && (configured.toLowerCase() === 'auto' || configured !== device.path)) {
			this.log(
				'info',
				`Using detected serial device ${device.path}${device.vendorId ? ` (${device.vendorId}:${device.productId ?? 'unknown'})` : ''}`,
			)
			return device.path
		}

		return configured
	}

	private updateVariables(): void {
		const values: Record<string, string> = {
			connected: this.connection?.isOpen ? 'yes' : 'no',
			atem_connected: this.atemConnected ? 'yes' : 'no',
		}

		for (let lamp = 1; lamp <= MAX_LAMPS; lamp++) {
			values[`lamp_${lamp}_state`] = this.getLampState(lamp)
		}

		this.setVariableValues(values)
	}
}
