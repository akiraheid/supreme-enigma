const fs = require('fs')
const itemRetriever = require('./itemRetriever')
const pug = require('pug')

exports.ARTICLES_DIR = 'articles'
exports.IDEAS_DIR = 'ideas'

function publishItem404(res) {
	const msg = 'Sorry, I haven\'t published that :('
	res.status(404)
		.send(pug.renderFile('./views/error.pug', {msg: msg}))
}

function sendItem(itemData, res) {
	fs.access(itemData.file, (err) => {
		if (err) {
			publishItem404(res)
			return
		}
		fs.readFile('./views/article.pug', 'utf-8', (err, data) => {
			const renderString = data.replace(/ARTICLE_FILE/, itemData.file)
			res.send(pug.render(renderString, {
				filename: './views/file',
				meta: itemData,
			}))
		})
	})
}

exports.getArticles = () => itemRetriever.getItems(exports.ARTICLES_DIR)

exports.getIdeas = () => itemRetriever.getItems(exports.IDEAS_DIR)

exports.handleItemRequestFor = (itemData, res) => {
	// Reject IDs that aren't alpha numeric
	if (itemData == undefined) {
		publishItem404(res)
		return
	}

	sendItem(itemData, res)
}
