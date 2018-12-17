const common = require('../js/common')
const express = require('express')
const router = express.Router()
const pug = require('pug')

const latest = common.getArticles(-5).reverse()

router.get('/', (req, res) => {
	res.send(pug.renderFile('./views/home.pug', {metas: latest}))
})

module.exports = router
