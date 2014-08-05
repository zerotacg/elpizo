PROTOC ?= protobuf-py3/src/protoc

.PHONY: all clean

all: elpizo/game_pb2.py

clean:
	rm -f elpizo/game_pb2.py

${PROTOC}: protobuf-py3
	cd $< && ./autogen.sh && ./configure && $(MAKE)

elpizo/game_pb2.py: proto/game.proto ${PROTOC}
	${PROTOC} -I=./proto --python_out=elpizo $<
