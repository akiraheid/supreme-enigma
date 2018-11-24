const express = require('express')
const router = express.Router()
const pug = require('pug')

router.get('/', (req, res) => {
	res.send(pug.renderFile('./views/projects.pug', {}))
})

module.exports = router
