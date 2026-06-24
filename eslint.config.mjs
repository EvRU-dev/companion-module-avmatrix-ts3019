import { generateEslintConfig } from '@companion-module/tools/eslint/config.mjs'

const companionConfig = await generateEslintConfig({
	enableTypescript: true,
})

export default [
	{
		ignores: [
			'examples/atem-ts3019-triggers/vendor/**',
			'examples/atem-ts3019-triggers/import-atem-ts3019-triggers.mjs',
		],
	},
	...companionConfig,
]
