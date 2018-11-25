const common = require('../js/common')
const express = require('express')
const pug = require('pug')
const router = express.Router()

const numMeta = 5
const ideaMetas = []
const ideaDir = 'ideas'

common.getMetas(ideaDir, ideaMetas, numMeta)

router.get('/', (req, res) => {
	res.send(pug.renderFile('./views/articleList.pug', {metas: ideaMetas}))
})

router.get('/:idea', (req, res) => {
	const filePath = './ideas/' + req.params.idea + '.md'
	common.sendArticle(filePath, res)
})

module.exports = router
