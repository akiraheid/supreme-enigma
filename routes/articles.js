const common = require('../js/common')
const express = require('express')
const path = require('path')
const router = express.Router()

router.get('/:articleNum', (req, res) => {
	const articleNum = req.params.articleNum
	const filePath = path.join(common.ARTICLES_DIR, articleNum + '.md')
	common.sendArticle(filePath, res)
})

module.exports = router
