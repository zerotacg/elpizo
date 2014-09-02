/** @jsx React.DOM */

module React from "react/react-with-addons";

export var DamageNumber = React.createClass({
  render: function () {
    var entity = this.props.entity;
    var renderer = this.props.renderer;

    var position = renderer.toScreenCoords(entity.location);

    return <div style={{
      transform: "translate(" + (position.x + 16 + "px") + "," +
                                (position.y - (entity.getHeight() - 1) * 32 + "px") + ")"}}>
      <div className="damage">
        <div className="inner">
          {this.props.damage}
        </div>
      </div>
    </div>;
  }
});
