/** @jsx React.DOM */

module React from "react";

module colors from "client/util/colors";

var PlayerName = React.createClass({
  render: function () {
    var entity = this.props.entity;

    var position = this.props.renderer.toScreenCoords(
        this.props.entity.location);

    return <div className="player-name"
                style={{transform: "translate(" +
                    (position.x + 16 + "px") + "," +
                    (position.y - 42 + "px") + ")"}}>
      <div className="inner"
           style={{color: colors.makeColorForString(entity.name)}}>{entity.name}</div>
    </div>;
  }
});

export var PlayerNames = React.createClass({
  render: function () {
    if (this.props.game.realm === null) {
      return null;
    }

    var entities = this.props.game.realm.getAllEntities().map((entity) =>
        <PlayerName key={entity.id} entity={entity}
                    renderer={this.props.game.renderer} />);

    return <div>{entities}</div>;
  }
});
