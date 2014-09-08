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

export class Vector3 extends geometry.Vector3 {
  toProtobuf() {
    return new geometryProtos.Vector3({x: this.x, y: this.y, z: this.z});
  }

  copy() {
    return new Vector3(this.x, this.y, this.z);
  }
}

Vector3.fromProtobuf = (proto) => {
  return new Vector3(proto.x, proto.y, proto.z);
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
