name := supreme-enigma
pack ::= "public.tgz"
pwd ::= $(shell pwd)
auditImage = ${name}-audit
builderImage = ${name}-builder
updateImage = ${name}-lock-update
nodeImage = docker.io/library/node:17-alpine

app: .env Dockerfile clean
	podman build -t ${builderImage} .
	-podman stop ${builderImage}
	-podman rm ${builderImage}
	podman run --name ${builderImage} \
		-v $(shell pwd)/.env:/src/.env \
		-v $(shell pwd)/app.js:/src/app.js \
		-v $(shell pwd)/ideas/:/src/ideas/ \
		-v $(shell pwd)/layouts/:/src/layouts/ \
		-v $(shell pwd)/src/:/src/src/ \
		${builderImage}
	podman cp ${builderImage}:/src/build/ .
	podman stop ${builderImage}
	podman rm ${builderImage}

audit: package-lock.json
	podman run --rm --name ${auditImage}\
		-v ${pwd}/package-lock.json:/package-lock.json:ro \
		--entrypoint "npm" \
		${nodeImage} audit --package-lock-only

clean:
	-rm -r build ${pack}
	mkdir -p build

deploy: clean app package upload

package: app
	cd build && tar -czf ../${pack} .

serve: app
	cd build && python3 -m http.server

update-lock: package.json
	-podman stop ${updateImage}
	-podman rm ${updateImage}
	podman run \
		--name ${updateImage} \
		-v ${pwd}/package.json:/package.json:ro \
		-w / \
		docker.io/node:17-alpine npm install --package-lock
	podman cp ${updateImage}:/package-lock.json .
	podman stop ${updateImage}
	podman rm ${updateImage}

upload: package
	-ssh www "cd ~/prod && rm -r *"
	scp ${pack} www:~/prod
	ssh www "cd ~/prod && tar -xzf ${pack} && rm ${pack}"

.PHONY: app clean deploy package serve upload
