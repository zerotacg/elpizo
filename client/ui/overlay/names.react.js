/** @jsx React.DOM */

module React from "react";

module colors from "client/util/colors";

var Name = React.createClass({
  render: function () {
    var entity = this.props.entity;
    var renderer = this.props.renderer;

    var position = renderer.toScreenCoords(entity.location);

    return <div className="player-name"
                style={{transform: "translate(" +
                    (position.x + 16 + "px") + "," +
                    (position.y + 32 - 32 * entity.getHeight() - 16) + "px)"}}>
      <div className="inner"
           style={{color: colors.makeColorForString(entity.name)}}>{entity.name}</div>
    </div>;
  }
});

export var Names = React.createClass({
  render: function () {
    if (this.props.realm === null) {
      return null;
    }

    var names = this.props.realm.getAllEntities()
      .filter((entity) => entity.name)
      .map((entity) =>
          <Name key={entity.id} entity={entity}
                renderer={this.props.renderer} />);

    return <div>{names}</div>;
  }
});
