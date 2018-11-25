const common = require('../js/common')
const express = require('express')
const pug = require('pug')
const router = express.Router()

const numArticles = 5
const articleMetas = []
const articleDir = 'articles'
common.getMetas(articleDir, articleMetas, numArticles)

router.get('/', (req, res) => {
	res.send(pug.renderFile('./views/articleList.pug', {
		metas: articleMetas,
		title: 'Articles'
	}))
})

// Rely on Express allowing only [A-Za-z0-9_] to prevent exploitation
router.get('/:article', (req, res) => {
	const filePath = './articles/' + req.params.article + '.md'
	common.sendArticle(filePath, res)
})

module.exports = router
