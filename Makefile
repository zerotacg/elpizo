PROTOC ?= protobuf-py3/src/protoc

.PHONY: all

all: ${PROTOC}

${PROTOC}: protobuf-py3
	cd $< && ./autogen.sh && ./configure && $(MAKE)
