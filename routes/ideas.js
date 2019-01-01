const common = require('../js/common')
const express = require('express')
const path = require('path')
const pug = require('pug')
const router = express.Router()

const ideas = []
const ideaMap = {}
const pageSummary = 'A collection of random, incomplete ideas'

common.getIdeas()
	.then((data) => {
		for (const datum of data) {
			ideas.push(datum)
			ideaMap[datum.url] = datum
		}
	})

router.get('/', (req, res) => {
	res.send(pug.renderFile('./views/itemList.pug', {
		metas: ideas,
		summary: pageSummary,
	}))
})

router.get('/:id', (req, res) => {
	const id = req.params.id
	common.handleItemRequestFor(ideaMap[path.join(common.IDEAS_DIR, id)], res)
})

module.exports = router
