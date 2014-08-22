module geometry from "client/util/geometry";
module geometryProtos from "client/protos/geometry";

export class Vector2 extends geometry.Vector2 {
  toProtobuf() {
    return new geometryProtos.Vector2({x: this.x, y: this.y});
  }

  copy() {
    return new Vector2(this.x, this.y);
  }
}

Vector2.fromProtobuf = (proto) => {
  return new Vector2(proto.x, proto.y);
}

export class Rectangle extends geometry.Rectangle {
  toProtobuf() {
    return new geometryProtos.Rectangle({left: this.left, top: this.top,
                                         width: this.width,
                                         height: this.height});
  }

  copy() {
    return new Rectangle(this.left, this.top, this.width, this.height);
  }
}

Rectangle.fromProtobuf = (proto) => {
  return new Rectangle(proto.left, proto.top, proto.width, proto.height);
}
