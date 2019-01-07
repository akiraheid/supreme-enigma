const createTestCafe = require('testcafe')
let testcafe = null

createTestCafe()
	.then(tc => {
		testcafe = tc
		const runner = testcafe.createRunner()
		const options = {
			assertionTimeout: 200,
			selectorTimeout: 200,
			pageLoadTimeout: 500,
		}

		return runner
			.src(['./tests/ui/*',
				'!./tests/ui/runner.js',
				'!./tests/ui/util.js'])
			.browsers(['firefox:headless'])
			.run(options)
	})
	.then(_ => testcafe.close())
