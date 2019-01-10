const files = require('./files.js')
const fs = require('fs')
const git = require('simple-git')()

exports.getItems = (itemsDir) => {

	function getItemTitle(filePath) {
		const data = fs.readFileSync(filePath, 'utf-8').split('\n')
		const itemTitle = data[0].match(/[^#].*/)[0].trim()
		return itemTitle
	}

	function getItemTitles(metas) {
		return new Promise((resolve, _) => {
			for (const meta of metas) {
				meta.title = getItemTitle(meta.file)
			}
			resolve(metas)
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

	function getFileMetas(fileArr) {
		return new Promise((resolve, _) => {
			const promises = []
			for (const file of fileArr) {
				promises.push(getFirstLastPublish(file))
			}

			Promise.all(promises)
				.then(getItemTitles)
				.then(resolve)
		})
	}

	function sortByFirstPublished(metas) {
		return new Promise((resolve, _) => {
			resolve(metas.sort((a, b) => a.firstPublishDate < b.firstPublishDate))
		})
	}

	return new Promise((resolve, _) => {
		files.getNames(itemsDir)
			.then(files => getFileMetas(files))
			.then(metas => sortByFirstPublished(metas))
			.then(sorted => resolve(sorted))
	})
}
