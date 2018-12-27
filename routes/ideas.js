const common = require('../js/common')
const express = require('express')
const pug = require('pug')
const router = express.Router()

const allIdeas = common.getIdeas(0)
const pageSummary = 'A collection of random, incomplete ideas'

router.get('/', (req, res) => {
	res.send(pug.renderFile('./views/itemList.pug', {
		metas: allIdeas,
		summary: pageSummary,
	}))
})

router.get('/:idea', (req, res) => {
	const filePath = './ideas/' + req.params.idea + '.md'
	common.sendArticle(filePath, res)
})

module.exports = router
