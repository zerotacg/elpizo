/** @jsx React.DOM */

module React from "react";

class _Avatar {
  render() {
    return <i className="avatar"></i>;
  }
}
var Avatar = React.createClass(_Avatar.prototype);

class _Map {
  render() {
    return <div className="map" onClick={this.onClick}>
      <Avatar />
    </div>;
  }

  onClick(e) {
    this.props.onMapClick(e);
  }
}
var Map = React.createClass(_Map.prototype);

export default = Map;
