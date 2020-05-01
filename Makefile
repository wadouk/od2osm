ELM=./node_modules/.bin/elm make --optimize
DIST=static
SRC=elm
OUTPUT=$(DIST)/index.js

dev: $(DIST)
	fsmonitor -d assets -s '+*.*' cp assets/* $(DIST)/ & \
	fsmonitor -d elm -s '+*.elm' elm make elm/Main.elm --output $(OUTPUT) & \
	echo $(PATH)
	nodemon &\
	wait

$(DIST):
	mkdir -p $@


