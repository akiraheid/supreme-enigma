const common = require('../js/common')
const express = require('express')
const router = express.Router()
const pug = require('pug')

const latest = common.getArticles(-5).reverse()
const pageSummary = 'The world is what we let it become'

router.get('/', (req, res) => {
	res.send(pug.renderFile('./views/itemList.pug', {
		metas: latest,
		summary: pageSummary,
	}))
})

module.exports = router
