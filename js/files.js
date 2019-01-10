const fs = require('fs')
const path = require('path')

exports.getNames = (dir) => {
	return new Promise((resolve, _) => {
		const contentDir = path.join(process.cwd(), dir)
		const files = fs.readdirSync(contentDir).map(file => path.join(dir, file))
		resolve(files)
	})
}

