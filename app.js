const Metalsmith = require('metalsmith')
const collections = require('metalsmith-collections')
const layouts = require('metalsmith-layouts')
const markdown = require('metalsmith-markdown')
const permalinks = require('metalsmith-permalinks')

Metalsmith(__dirname)
	.metadata({
		title: '',
	})
	.source('./src')
	.destination('./build')
	.clean(true)
	.use(collections({
		posts: {
			pattern: 'posts/*.md',
			refer: false,
		},
		projects: {
			pattern: 'projects/*.md',
			refer: false,
		},
	}))
	.use(markdown())
	.use(permalinks())
	.use((files) => {
		// Grab all items in a collection and add to list for a collection index
		const options = {
			path: 'posts',
			collections: ['posts'],
			keys: ['title', 'path', 'date'],
			limit: undefined,
			sortBy: (a, b) => a.date < b.date,
		}

		let indexKey = undefined
		const data = []
		for (const key in files) {
			// Search through all files via key and record file metadata
			// when the file is found to match collection defined in options.
			// If path is found in the meanwhile, record key to set data in
			// later.
			if (files[key].path === options.path) {
				indexKey = key
			} else if (files[key].collection.some((collection) =>
				options.collections.includes(collection))) {
				const meta = {}

				// Store metadata specified in options
				for (const optKey of options.keys) {
					meta[optKey] = files[key][optKey]
				}
				data.push(meta)
			}
		}

		if (indexKey) {
			if (files[indexKey].collectionKeys === undefined) {
				files[indexKey].collectionKeys = {}
			}

			// Sort based on option sort function
			data.sort(options.sortBy)
			files[indexKey].collectionKeys[options.path] = data
		}

		return files
	})
	.use(layouts({
		engine: 'pug'
	}))
	.build(function(err, _) {
		if (err) { throw err }
	})
