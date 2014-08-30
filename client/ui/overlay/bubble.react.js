/** @jsx React.DOM */

module React from "react";

export var Bubble = React.createClass({
  render: function () {
    var entity = this.props.entity;
    var renderer = this.props.renderer;

    var position = renderer.toScreenCoords(entity.location);

    return <div style={{
      transform: "translate(" + (position.x + 16 + "px") + "," +
                                (position.y - 32 + "px") + ")"}}>
      <div className="bubble">
        <div className="anchor">
          <div className="inner">
            {this.props.text}
          </div>
        </div>
      </div>
    </div>;
  }
});
