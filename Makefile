pack ::= "public.tgz"

build: node_modules
	node app.js

clean:
	-rm -r build ${pack}

deploy: build package upload

node_modules: package.json
	npm install

package: build
	cd build && tar -czf ../${pack} .

serve: build
	cd build && python3 -m http.server

upload: package
	-ssh www "cd ~/prod && rm -r *"
	scp ${pack} www:~/prod
	ssh www "cd ~/prod && tar -xzf ${pack} && rm ${pack}"

.PHONY: clean deploy package serve upload
