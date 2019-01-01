const common = require('../js/common')
const express = require('express')
const router = express.Router()
const path = require('path')
const pug = require('pug')

const articles = []
const articleMap = {}
const pageSummary = 'The world is what we let it become'

common.getArticles()
	.then((data) => {
		for (const datum of data) {
			articles.push(datum)
			articleMap[datum.url] = datum
		}
	})

router.get('/', (req, res) => {
	res.send(pug.renderFile('./views/itemList.pug', {
		metas: articles,
		summary: pageSummary,
	}))
})

router.get('/articles/:id', (req, res) => {
	const id = req.params.id
	common.handleItemRequestFor(articleMap[path.join(common.ARTICLES_DIR, id)], res)
})

module.exports = router
