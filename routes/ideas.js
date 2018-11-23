const express = require('express')
const router = express.Router()
const pug = require('pug')

router.get('/', (req, res) => {
    res.send(pug.renderFile('./views/ideas.pug', {}))
})

module.exports = router
