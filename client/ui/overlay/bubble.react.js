/** @jsx React.DOM */

module React from "react";

export var Bubble = React.createClass({
  render: function () {
    var entity = this.props.entity;
    var renderer = this.props.renderer;

    var position = renderer.toScreenCoords(entity.location);

    return <div className="bubble"
                style={{
                    left: position.x + 16 + "px",
                    top: position.y - 32 + "px"}}>
      <div className="anchor">
        <div className="inner">
          {this.props.text}
        </div>
      </div>
    </div>;
  }
});
