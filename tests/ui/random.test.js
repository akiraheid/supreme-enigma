const util = require('./util.js')

import { Selector } from 'testcafe'

function randInt(min, max) {
	min = Math.ceil(min)
	max = Math.floor(max)
	return Math.floor(Math.random() * (max - min)) + min
}

function getRandomRoute() {
	const depth = randInt(0, 20)
	const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-'
	const route = []

	for (let i = 0; i < depth; ++i) {
		const len = randInt(0, 50)
		for (let j = 0; j < len; ++j) {
			route.push(alphabet[randInt(0, alphabet.length)])
		}
		route.push('/')
	}
	return route.join('')
}

// eslint-disable-next-line no-undef
fixture('Random page')
	.page('http://localhost:8080/' + getRandomRoute())

// eslint-disable-next-line no-undef
test('unpublished page info is displayed', async t => {
	const errorText = Selector('.centered-text')

	// Check for unpublished message
	await t.expect(errorText.exists).ok()
})

util.testBasePageFormat()
