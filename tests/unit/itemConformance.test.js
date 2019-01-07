const common = require('../../js/common.js')
const files = require('../../js/files.js')
const fs = require('fs')
const tap = require('tap')

const dirsToTest = [common.ARTICLES_DIR, common.IDEAS_DIR]

function getFilesToTest() {
	return new Promise((resolve, _) => {
		const promises = []
		dirsToTest.map(dir => { promises.push(files.getNames(dir)) })
		Promise.all(promises)
			.then(res => {
				const filesToTest = res.reduce((acc, cur) => acc.concat(cur))
				resolve(filesToTest)
			})
	})
}

getFilesToTest()
	.then(filePaths => {
		filePaths.forEach(filePath => {
			tap.test(filePath, tap => {
				tap.test('starting line is formatted correctly', tap => {
					const startFormat = /^# .+/
					const startingLine =
						fs.readFileSync(filePath, 'utf-8').split('\n')[0]

					tap.match(startingLine, startFormat)
					tap.end()
				})
				tap.test('second', tap => {
					const badChars = /[^a-zA-Z0-9-.]/g
					const fileName = filePath.slice(filePath.lastIndexOf('/')+1)
					tap.notMatch(fileName, badChars)
					tap.end()
				})
				tap.end()
			})
		})
	})
