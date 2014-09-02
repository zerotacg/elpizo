/** @jsx React.DOM */

module React from "react/react-with-addons";

module colors from "client/util/colors";

export var Bubble = React.createClass({
  render: function () {
    var entity = this.props.entity;
    var renderer = this.props.renderer;

    var position = renderer.toScreenCoords(entity.location);

    return <div style={{
      transform: "translate(" + (position.x + 16 + "px") + "," +
                                (position.y - (entity.getHeight() - 1) * 32 + 8 + "px") + ")"}}>
      <div className="bubble">
        <div className="anchor">
          <div className="inner" style={{color: colors.makeColorForString(entity.name)}}>
            {this.props.text}
          </div>
        </div>
      </div>
    </div>;
  }
});
