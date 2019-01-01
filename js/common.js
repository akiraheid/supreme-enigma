const fs = require('fs')
const git = require('simple-git')()
const path = require('path')
const pug = require('pug')

exports.ARTICLES_DIR = 'articles'
exports.IDEAS_DIR = 'ideas'

function getItems(itemsDir) {

	function getItemTitle(filePath) {
		const data = fs.readFileSync(filePath, 'utf-8').split('\n')
		const itemTitle = data[0].match(/[^#].*/)[0].trim()
		return itemTitle
	}

	function getFiles(dir) {
		return new Promise((resolve, _) => {
			const contentDir = path.join(process.cwd(), dir)
			const files = fs.readdirSync(contentDir).map(file => path.join(dir, file))
			resolve(files)
		})
	}

	function getFirstLastPublish(fileRepoPath) {
		return new Promise((resolve, reject) => {
			git.raw(['log', '--date=iso', '--pretty=format:"%H %cI"', '--follow', fileRepoPath], (err, result) => {
				if (err) { reject(err) }
				const ret = {
					file: fileRepoPath,
					firstPublishDate: undefined,
					firstPublishHash: undefined,
					lastEditDate: undefined,
					lastEditHash: undefined,
					url: fileRepoPath.slice(0, fileRepoPath.lastIndexOf('.'))
				}

				result = result.split('\n')
				let commit = result[0].slice(1, result[0].length-1).split(' ')
				ret.lastEditHash = commit[0]
				ret.lastEditDate = new Date(commit[1])

				commit = result[result.length-1].slice(1, result[0].length-1).split(' ')
				ret.firstPublishHash = commit[0]
				ret.firstPublishDate = new Date(commit[1])
				resolve(ret)
			})
		})
	}

	function getItemTitles(metas) {
		return new Promise((resolve, _) => {
			for (const meta of metas) {
				meta.title = getItemTitle(meta.file)
			}
			resolve(metas)
		})
	}

	function getFileMetas(fileArr) {
		return new Promise((resolve, _) => {
			const promises = []
			for (const file of fileArr) {
				promises.push(getFirstLastPublish(file))
			}

			Promise.all(promises)
				.then((metas) => getItemTitles(metas))
				.then((metas) => resolve(metas))
		})
	}

	function sortByFirstPublished(metas) {
		return new Promise((resolve, _) => {
			resolve(metas.sort((a, b) => a.firstPublishDate < b.firstPublishDate))
		})
	}

	return new Promise((resolve, _) => {
		getFiles(itemsDir)
			.then(files => getFileMetas(files))
			.then(metas => sortByFirstPublished(metas))
			.then(sorted => resolve(sorted))
	})
}

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

exports.getArticles = () => getItems(exports.ARTICLES_DIR)

exports.getIdeas = () => getItems(exports.IDEAS_DIR)

exports.handleItemRequestFor = (itemData, res) => {
	// Reject IDs that aren't alpha numeric
	if (itemData == undefined) {
		publishItem404(res)
		return
	}

	sendItem(itemData, res)
}
