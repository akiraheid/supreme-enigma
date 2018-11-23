const express = require('express')
const app = express()

// Body-handling middleware
app.use(express.urlencoded())

// Routes
const home = require('./routes/home')

app.use('/', home)

const PORT = process.env.PORT || 8080
app.listen(PORT, () => console.log('Listening on port ' + PORT))
