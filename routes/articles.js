const common = require('../js/common')
const express = require('express')
const router = express.Router()

router.get('/:id', (req, res) => {
	const id = req.params.id
	common.handleItemRequestFor(common.ARTICLES_DIR, id, res)
})

module.exports = router
