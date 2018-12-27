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

router.get('/:id', (req, res) => {
	const id = req.params.id
	common.handleItemRequestFor(common.IDEAS_DIR, id, res)
})

module.exports = router
