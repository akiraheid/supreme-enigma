const fs = require('fs')
const path = require('path')
const pug = require('pug')

exports.getMetas = (dir, metas, maxMetas) => {
	const contentDir = path.join(process.cwd(), dir)
	fs.readdir(contentDir, (err, files) => {
		let metaCount = 0
		files.forEach(file => {
			const filePath = path.join(contentDir, file)
			fs.stat(filePath, (err, stats) => {
				if (metaCount++ < maxMetas && !stats.isDirectory()) {
					fs.readFile(filePath, 'utf-8', (err, data) => {
						const meta = {publishDate: '', title: '', url: ''}
						data = data.split('\n')
						meta.title = data[0].match(/[^#].*/)[0].trim()
						meta.publishDate = data[1].match(/[0-9]{8}/)[0].trim()
						meta.url = path.join(
							dir, file.slice(0, file.lastIndexOf('.')))
						metas.push(meta)
					})
				}
			})
		})
	})
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
