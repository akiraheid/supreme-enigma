const fs = require('fs')

const Metalsmith = require('metalsmith')
const collections = require('metalsmith-collections')
const layouts = require('metalsmith-layouts')
const markdown = require('metalsmith-markdown')
const permalinks = require('metalsmith-permalinks')

const dest = './build'

// Aggregate all files in a collection and store them in an array in the index
// file.
const createIndexFiles = (files) => {
	// Metadata options for index pages.
	// {
	//   'indexPath': {
	//     collections: [],
	//     keys: [],
	//     sortBy: function
	//   }
	// }
	// Where
	// key  The path of the index page. E.g. 'posts' or 'pages/lists'
	// collections  The collections to aggregate for this index
	// keys  The keys from a Metalsmith file Object to store. E.g. 'title' or
	//       'date'
	// sortBy  The method of sorting files in the aggregated data
	const indices = {
		'lists': {
			collections: ['lists'],
			keys: ['title', 'path'],
			sortBy: (a, b) => a.title > b.title,
		},
		'notes': {
			collections: ['notes'],
			keys: ['title', 'path'],
			sortBy: (a, b) => a.title > b.title,
		},
		'posts': {
			collections: ['posts'],
			keys: ['title', 'path', 'date'],
			sortBy: (a, b) => { // Date latest to oldest
				if (a.date === undefined) { return true }
				else if (b.date === undefined) { return false }
				return a.date < b.date
			},
		},
	}

	// Map of collections to file keys in the collections.
	// { 'posts': ['posts/1', 'posts/2'] }
	const map = {}

	// For each Metalsmith file, add the file to the associated collection in
	// the collections map
	for (const key in files) {
		const collections = files[key].collection
		collections.forEach((collection) => {
			if (!map[collection]) { map[collection] = [key] }
			else { map[collection].push(key) }
		})
	}

	// For each index, get the metadata from Metalsmith files in collections of
	// interest for the index
	for (const index in indices) {
		const indexKey = `${index}/index.html`
		const data = []

		// For each collection of interest for the index, get the specified
		// Metalsmith file metadata
		const collections = indices[index].collections
		collections.forEach((collection) => {

			// For each Metalsmith file key, get the metadata of interest
			const fileKeys = map[collection]
			fileKeys.forEach((fileKey) => {
				const metadataKeys = indices[index].keys
				const metadata = {}
				metadataKeys.forEach((metadataKey) => {
					metadata[metadataKey] = files[fileKey][metadataKey]
				})
				data.push(metadata)
			})
		})

		// Sort the collected metadata
		const sortBy = indices[index].sortBy
		data.sort(sortBy)

		files[indexKey].indexData = data
	}

	return files
}

Metalsmith(__dirname)
	.metadata({
		title: '',
	})
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
		},
		projects: {
			pattern: 'projects/*.md',
			refer: false,
		},
	}))
	.use(markdown())
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
