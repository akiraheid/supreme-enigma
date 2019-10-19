
build: node_modules
	node app.js

node_modules: package.json
	npm install

serve: build
	cd build && python -m http.server

.PHONY: build
