name := se-builder
pack ::= "public.tgz"

build:
	podman build -t ${name} .
	podman run --rm --name ${name} \
		-v $(shell pwd)/:/src/ \
		${name}

clean:
	-rm -r build ${pack}

deploy: clean build package upload

package: build
	cd build && tar -czf ../${pack} .

serve: clean build
	cd build && python3 -m http.server

upload: package
	-ssh www "cd ~/prod && rm -r *"
	scp ${pack} www:~/prod
	ssh www "cd ~/prod && tar -xzf ${pack} && rm ${pack}"

.PHONY: build clean deploy package serve upload
