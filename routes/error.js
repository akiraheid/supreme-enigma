const express = require('express')
const pug = require('pug')
const router = express.Router()

router.get('*', (req, res) => {
	const msg = 'That page doesn\'t exist :('
	res.status(404)
		.send(pug.renderFile('./views/error.pug', {msg: msg}))
})

module.exports = router
