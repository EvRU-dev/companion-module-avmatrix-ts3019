#!/usr/bin/env node
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'

const require = createRequire(import.meta.url)
const initSqlJs = require('./vendor/sql.js/sql-wasm.js')

const DEFAULT_COLLECTION_LABEL = 'ATEM to TS3019'
const DEFAULT_ATEM_MODEL_ID = 6

function makeId(prefix = '') {
	return prefix + randomBytes(15).toString('base64url').replace(/-/g, '_').slice(0, 20)
}

function expr(value, isExpression = false) {
	return { value, isExpression }
}

function parseArgs(argv) {
	const args = {
		atemLabel: 'atem',
		ts3019Label: 'TS3019',
		lampCount: 12,
		collectionLabel: DEFAULT_COLLECTION_LABEL,
		atemModelId: DEFAULT_ATEM_MODEL_ID,
		setAtemModel: true,
		dryRun: false,
	}

	for (let index = 0; index < argv.length; index++) {
		const arg = argv[index]
		const next = () => {
			index += 1
			if (index >= argv.length) throw new Error(`Missing value for ${arg}`)
			return argv[index]
		}

		switch (arg) {
			case '--db':
				args.db = next()
				break
			case '--atem-label':
				args.atemLabel = next()
				break
			case '--ts3019-label':
				args.ts3019Label = next()
				break
			case '--lamp-count':
				args.lampCount = Number(next())
				break
			case '--collection-label':
				args.collectionLabel = next()
				break
			case '--atem-model-id':
				args.atemModelId = Number(next())
				break
			case '--no-set-atem-model':
				args.setAtemModel = false
				break
			case '--dry-run':
				args.dryRun = true
				break
			case '-h':
			case '--help':
				printHelp()
				process.exit(0)
				break
			default:
				throw new Error(`Unknown argument: ${arg}`)
		}
	}

	if (!args.db) throw new Error('Missing required --db argument')
	if (!Number.isInteger(args.lampCount) || args.lampCount < 1 || args.lampCount > 12) {
		throw new Error('--lamp-count must be between 1 and 12')
	}
	if (!Number.isInteger(args.atemModelId)) throw new Error('--atem-model-id must be a number')

	return args
}

function printHelp() {
	console.log(`Import ATEM-to-TS3019 trigger collection into a Companion v4 SQLite database.

Options:
  --db PATH                  Path to Companion v4 db.sqlite
  --atem-label LABEL         Companion label for the ATEM connection. Default: atem
  --ts3019-label LABEL       Companion label for the TS3019 connection. Default: TS3019
  --lamp-count NUMBER        Number of ATEM inputs / TS3019 lamps to map. Default: 12
  --collection-label LABEL   Trigger collection label. Default: ATEM to TS3019
  --atem-model-id NUMBER     Offline ATEM model ID. Default: 6 (2 M/E Production 4K)
  --no-set-atem-model        Do not update the ATEM model setting
  --dry-run                  Print planned changes without writing
`)
}

function rows(db, sql, params = []) {
	const statement = db.prepare(sql)
	try {
		statement.bind(params)
		const result = []
		while (statement.step()) result.push(statement.getAsObject())
		return result
	} finally {
		statement.free()
	}
}

function run(db, sql, params = []) {
	const statement = db.prepare(sql)
	try {
		statement.run(params)
	} finally {
		statement.free()
	}
}

function saveJson(db, table, id, value) {
	run(db, `insert or replace into ${table}(id,value) values(?,?)`, [id, JSON.stringify(value)])
}

function findInstance(db, label, moduleId) {
	const matches = rows(db, 'select id,value from instances')
		.map((row) => [row.id, JSON.parse(row.value)])
		.filter(([, value]) => value.moduleId === moduleId && value.label === label)

	if (matches.length === 0)
		throw new Error(`Could not find Companion connection label "${label}" using module "${moduleId}"`)
	if (matches.length > 1) throw new Error(`Found multiple connections label "${label}" using module "${moduleId}"`)
	return matches[0]
}

function findCollectionIds(db, label) {
	return rows(db, 'select id,value from trigger_collections')
		.map((row) => [row.id, JSON.parse(row.value)])
		.filter(([, value]) => value.label === label)
		.map(([id]) => id)
}

function maxCollectionSortOrder(db) {
	let maxSort = -1
	for (const row of rows(db, 'select value from trigger_collections')) {
		const value = JSON.parse(row.value)
		maxSort = Math.max(maxSort, Number(value.sortOrder ?? 0))
	}
	return maxSort
}

function deleteCollectionTriggers(db, collectionIds) {
	let deleted = 0
	for (const row of rows(db, "select id,value from controls where id like 'trigger:%'")) {
		const value = JSON.parse(row.value)
		if (collectionIds.includes(value.options?.collectionId)) {
			run(db, 'delete from controls where id=?', [row.id])
			deleted += 1
		}
	}

	for (const collectionId of collectionIds) {
		run(db, 'delete from trigger_collections where id=?', [collectionId])
	}

	return deleted
}

function makeSyncAction(ts3019Id, atemLabel) {
	return {
		id: makeId(),
		definitionId: 'sync_program_preview',
		connectionId: ts3019Id,
		options: {
			programInput: expr(`$(${atemLabel}:pgm1_input_id)`, true),
			previewInput: expr(`$(${atemLabel}:pvw1_input_id)`, true),
			transitionActive: expr(`$(${atemLabel}:tbar_1) > 0`, true),
		},
		upgradeIndex: -1,
		type: 'action',
	}
}

function makeCondition(atemId, feedbackId, inputId, inverted) {
	const options =
		feedbackId === 'inTransition'
			? {
					mixeffect: expr(1),
				}
			: {
					mixeffect: expr(1),
					input: expr(inputId),
				}

	return {
		id: makeId(),
		definitionId: feedbackId,
		connectionId: atemId,
		options,
		type: 'feedback',
		style: {
			color: 16777215,
			bgcolor: feedbackId === 'program' || feedbackId === 'inTransition' ? 16711680 : 65280,
		},
		isInverted: expr(inverted),
		children: {},
	}
}

function makeTrigger(collectionId, ts3019Id, atemId, atemLabel, name, sortOrder, conditions) {
	return {
		type: 'trigger',
		options: {
			name,
			enabled: true,
			sortOrder,
			collectionId,
		},
		actions: [makeSyncAction(ts3019Id, atemLabel)],
		condition: conditions.map(({ feedbackId, inputId, inverted }) =>
			makeCondition(atemId, feedbackId, inputId, inverted),
		),
		events: [{ id: makeId(), type: 'condition_true', enabled: true, options: {} }],
		localVariables: [],
	}
}

function backupDatabase(dbPath) {
	const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-')
	const backupPath = `${dbPath}.before-atem-ts3019-triggers-${stamp}`
	fs.copyFileSync(dbPath, backupPath)
	return backupPath
}

async function main() {
	const args = parseArgs(process.argv.slice(2))
	const dbPath = path.resolve(args.db)
	if (!fs.existsSync(dbPath)) throw new Error(`Database not found: ${dbPath}`)

	const scriptDir = path.dirname(fileURLToPath(import.meta.url))
	const SQL = await initSqlJs({
		locateFile: (file) => path.join(scriptDir, 'vendor', 'sql.js', file),
	})

	const db = new SQL.Database(fs.readFileSync(dbPath))
	const [atemId, atem] = findInstance(db, args.atemLabel, 'bmd-atem')
	const [ts3019Id, ts3019] = findInstance(db, args.ts3019Label, 'avmatrix-ts3019')
	const previousCollectionIds = findCollectionIds(db, args.collectionLabel)

	console.log(`ATEM connection: ${args.atemLabel} (${atemId})`)
	console.log(`TS3019 connection: ${args.ts3019Label} (${ts3019Id})`)
	console.log(`Collection: ${args.collectionLabel}`)
	console.log(`Triggers to create: ${args.lampCount * 4 + 2}`)

	if (args.dryRun) {
		if (previousCollectionIds.length)
			console.log(`Would replace existing collection ids: ${previousCollectionIds.join(', ')}`)
		if (args.setAtemModel) console.log(`Would set ATEM modelID to ${args.atemModelId}`)
		console.log('Dry run only; no changes written.')
		db.close()
		return
	}

	const backupPath = backupDatabase(dbPath)
	console.log(`Backup created: ${backupPath}`)

	const deleted = deleteCollectionTriggers(db, previousCollectionIds)
	if (deleted) console.log(`Deleted ${deleted} previous triggers from existing collection.`)

	ts3019.config = ts3019.config || {}
	ts3019.config.lampCount = args.lampCount
	saveJson(db, 'instances', ts3019Id, ts3019)

	if (args.setAtemModel) {
		atem.config = atem.config || {}
		atem.config.modelID = args.atemModelId
		saveJson(db, 'instances', atemId, atem)
	}

	const collectionId = makeId('atem_')
	saveJson(db, 'trigger_collections', collectionId, {
		id: collectionId,
		label: args.collectionLabel,
		sortOrder: maxCollectionSortOrder(db) + 1,
		children: [],
		metaData: { enabled: true },
	})

	let sortOrder = 0
	let created = 0
	for (let lamp = 1; lamp <= args.lampCount; lamp++) {
		const inputId = lamp
		const specs = [
			[`ATEM PGM ${inputId} on -> sync TS3019`, [{ feedbackId: 'program', inputId, inverted: false }]],
			[`ATEM PGM ${inputId} off -> sync TS3019`, [{ feedbackId: 'program', inputId, inverted: true }]],
			[`ATEM PVW ${inputId} on -> sync TS3019`, [{ feedbackId: 'preview', inputId, inverted: false }]],
			[`ATEM PVW ${inputId} off -> sync TS3019`, [{ feedbackId: 'preview', inputId, inverted: true }]],
		]

		for (const [name, conditions] of specs) {
			saveJson(
				db,
				'controls',
				`trigger:${makeId()}`,
				makeTrigger(collectionId, ts3019Id, atemId, args.atemLabel, name, sortOrder, conditions),
			)
			sortOrder += 1
			created += 1
		}
	}

	for (const [name, inverted] of [
		['ATEM transition running -> sync TS3019', false],
		['ATEM transition stopped -> sync TS3019', true],
	]) {
		saveJson(
			db,
			'controls',
			`trigger:${makeId()}`,
			makeTrigger(collectionId, ts3019Id, atemId, args.atemLabel, name, sortOrder, [
				{ feedbackId: 'inTransition', inputId: 0, inverted },
			]),
		)
		sortOrder += 1
		created += 1
	}

	fs.writeFileSync(dbPath, Buffer.from(db.export()))
	db.close()
	console.log(`Created ${created} triggers in collection ${collectionId}.`)
	console.log('Start Companion again, then open Triggers and check the new collection.')
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error))
	process.exit(1)
})
