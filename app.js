const express = require('express')
const app = express()

// Body-handling middleware
app.use(express.urlencoded())

// Routes
const articles = require('./routes/articles')
const home = require('./routes/home')
const ideas = require('./routes/ideas')
const projects = require('./routes/projects')

app.use('/', home)
app.use('/articles', articles)
app.use('/ideas', ideas)
app.use('/projects', projects)

const PORT = process.env.PORT || 8080
app.listen(PORT)
