/** @jsx React.DOM */

module React from "react";

export var DamageNumber = React.createClass({
  render: function () {
    var entity = this.props.entity;
    var renderer = this.props.renderer;

    var position = renderer.toScreenCoords(entity.location);
    var t = Math.pow(this.props.timer.getElapsedRatio(), 2);

    return <div className="damage"
                style={{
                    transform: "translate(" +
                        (position.x + 16 + "px") + "," +
                        (position.y - (32 + t * 16) + "px") + ")"}}>
      <div className="inner" style={{opacity: (1 - t)}}>
        {this.props.damage}
      </div>
    </div>;
  }
});
