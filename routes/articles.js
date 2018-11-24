const express = require('express')
const fs = require('fs')
const path = require('path')
const pug = require('pug')
const router = express.Router()

const numArticles = 5
const articleMetas = []
const articleDir = './articles'
fs.readdir(articleDir, (err, files) => {
	let articleCount = 0
	files.forEach(file => {
		const filePath = path.join(articleDir, file)
		fs.stat(filePath, (err, stats) => {
			if (articleCount++ < numArticles && !stats.isDirectory()) {
				fs.readFile(filePath, 'utf-8', (err, data) => {
					const articleMeta = {publishDate: '', title: '', url: ''}
					data = data.split('\n')
					articleMeta.title = data[0].match(/[^#].*/)[0].trim()
					articleMeta.publishDate = data[1].match(/[0-9]{8}/)[0].trim()
					articleMeta.url = filePath.slice(0, filePath.lastIndexOf('.'))
					articleMetas.push(articleMeta)
				})
			}
		})
	})
})

router.get('/', (req, res) => {
	res.send(
		pug.renderFile('./views/articles.pug', {articleMetas: articleMetas}))
})

// Rely on Express allowing only [A-Za-z0-9_] to prevent exploitation
router.get('/:article', (req, res) => {
	const filePath = './articles/' + req.params.article + '.md'
	fs.access(filePath, (err) => {
		if (err) {
			const msg = 'Sorry, I haven\'t published that article :('
			res.status(404)
				.send(pug.renderFile('./views/error.pug', {msg: msg}))
			return
		}
		fs.readFile('./views/article.pug', 'utf-8', (err, data) => {
			const renderString = data.replace(/ARTICLE_FILE/, filePath)
			res.send(pug.render(renderString, {filename: './views/file'}))
		})
	})
})

module.exports = router
