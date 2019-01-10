const common = require('../../js/common.js')
const files = require('../../js/files.js')
const util = require('./util.js')

import { Selector } from 'testcafe'

// eslint-disable-next-line no-undef
fixture('Homepage')
	.page('http://localhost:8080')

// eslint-disable-next-line no-undef
test('displays correct contents', async t => {
	let numArticles = await files.getNames(common.ARTICLES_DIR)
	numArticles = numArticles.length
	const articles = Selector('.item-list-item')
	await t.expect(articles.count).eql(numArticles)
})

util.testBasePageFormat()
