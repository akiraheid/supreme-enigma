const fs = require('fs')

const Metalsmith = require('metalsmith')
const collections = require('metalsmith-collections')
const layouts = require('metalsmith-layouts')
const markdown = require('metalsmith-markdown')
const permalinks = require('metalsmith-permalinks')

const dest = './build'

const createIndexFiles = (files, metalsmith) => {
	const metadata = metalsmith.metadata()
	const keys = ['path', 'title']
	const keysWDate = keys.concat(['date'])

	files['index.html'].indexData = getIndexData(metadata.posts, keysWDate)
	files['lists/index.html'].indexData = getIndexData(metadata.lists, keys)
	files['notes/index.html'].indexData = getIndexData(metadata.notes, keys)
	files['posts/index.html'].indexData = getIndexData(metadata.posts, keysWDate)
	files['projects/index.html'].indexData = getIndexData(metadata.projects, [])

	return files
}

function getIndexData(files, keys) {
	const ret = []
	files.forEach(file => {
		const data = {}
		keys.forEach(key => data[key] = file[key])
		ret.push(data)
	})

	return ret
}

Metalsmith(__dirname)
	.metadata({})
	.source('./src')
	.destination(dest)
	.clean(true)
	.use(collections({
		lists: {
			pattern: 'lists/*.md',
			refer: false,
		},
		notes: {
			pattern: 'notes/*.md',
			refer: false,
		},
		posts: {
			pattern: 'posts/*.md',
			refer: false,
			reverse: true,
			sortBy: 'date',
		},
		projects: {
			pattern: 'projects/*.md',
			refer: false,
		},
	}))
	.use(markdown({ gfm: true }))
	.use(permalinks())
	.use(createIndexFiles)
	.use(layouts({
		engine: 'pug'
	}))
	.build(function(err, _) {
		if (err) { throw err }

		fs.copyFileSync(
			'./node_modules/bootstrap/dist/css/bootstrap.min.css',
			`${dest}/css/bootstrap.min.css`)
	})
