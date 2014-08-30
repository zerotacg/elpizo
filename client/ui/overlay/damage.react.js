/** @jsx React.DOM */

module React from "react";

export var DamageNumber = React.createClass({
  render: function () {
    var entity = this.props.entity;
    var renderer = this.props.renderer;

    var position = renderer.toScreenCoords(entity.location);

    return <div className="damage"
                style={{
                    left: position.x + 16 + "px",
                    top: position.y - 32 + "px"}}>
      <div className="inner">
        {this.props.damage}
      </div>
    </div>;
  }
});
