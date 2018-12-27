const fs = require('fs')
const path = require('path')
const pug = require('pug')

exports.ARTICLES_DIR = 'articles'
exports.IDEAS_DIR = 'ideas'

function getItemTitle(filePath) {
	const data = fs.readFileSync(filePath, 'utf-8').split('\n')
	const itemTitle = data[0].match(/[^#].*/)[0].trim()
	return itemTitle
}

function getItems (itemsDir, start, end) {
	const items = []
	const contentDir = path.join(process.cwd(), itemsDir)
	const itemsData = fs.readdirSync(contentDir).sort((a, b) => {
		const regex = /^[0-9]+/
		const aMatches = a.match(regex)
		const bMatches = b.match(regex)
		const aInt = aMatches.length == 1 ? parseInt(aMatches[0], 10)
			: Number.MAX_SAFE_INTEGER
		const bInt = bMatches.length == 1 ? parseInt(bMatches[0], 10)
			: Number.MAX_SAFE_INTEGER

		return aInt - bInt
	}).slice(start, end)

	for (const item of itemsData) {
		const itemPath = path.join(itemsDir, item)
		const itemTitle = getItemTitle(itemPath)
		items.push({
			title: itemTitle,
			url: itemsDir + '/' +  item.split('.')[0]
		})
	}

	return items
}

exports.getArticles = (start, end) => {
	return getItems(exports.ARTICLES_DIR, start, end)
}

exports.getIdeas = (start, end) => {
	return getItems(exports.IDEAS_DIR, start, end)
}

exports.sendArticle = (filePath, res) => {
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
}
