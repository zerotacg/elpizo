/** @jsx React.DOM */

module React from "react";

module coords from "../util/coords";

export var Debug = React.createClass({
  getInitialState: function () {
    return {
      showRegions: false
    };
  },

  render: function () {
    var game = this.props.game;

    var viewportBounds = game.renderer.getAbsoluteViewportBounds();
    var cacheBounds = game.renderer.getAbsoluteCacheBounds();

    var maybeRegions = null;
    if (this.state.showRegions && game.realm !== null) {
      var regions = game.realm.getAllRegions()
          .sort((a, b) =>
            a.location.ary - b.location.ary ||
                a.location.arx - b.location.arx)
          .map((region) => {
            var aCoords = coords.regionToAbsolute(region.location);
            return <li key={region.getKey()}>{region.getKey()} ({aCoords.ax}, {aCoords.ay}, {aCoords.ax + coords.REGION_SIZE}, {aCoords.ay + coords.REGION_SIZE})</li>
          });
      maybeRegions = <ul>{regions}</ul>;
    }

    var maybeAvatarPosition = null;
    if (game.me !== null) {
      maybeAvatarPosition = "(" + game.me.location.ax.toFixed(2) + ", " + game.me.location.ay.toFixed(2) + ")";
    }

    return <div className="debug">
      <dl>
        <dt>Viewport Bounds</dt>
        <dd>({viewportBounds.aLeft.toFixed(2)}, {viewportBounds.aTop.toFixed(2)}, {viewportBounds.aRight.toFixed(2)}, {viewportBounds.aBottom.toFixed(2)})</dd>

        <dt>Cache Bounds</dt>
        <dd>({cacheBounds.aLeft.toFixed(2)}, {cacheBounds.aTop.toFixed(2)}, {cacheBounds.aRight.toFixed(2)}, {cacheBounds.aBottom.toFixed(2)})</dd>

        <dt># Regions Loaded</dt>
        <dd>
          {game.realm !== null ? game.realm.getAllRegions().length : "(no realm)"} (<a href="#" onClick={this.toggleShowRegions}>{this.state.showRegions ? "hide" : "show"}</a>)
          {maybeRegions}
        </dd>

        <dt># Entities Loaded</dt>
        <dd>{game.realm !== null ? game.realm.getAllEntities().length : "(no realm)"}</dd>

        <dt>Avatar Position</dt>
        <dd>{maybeAvatarPosition !== null ? maybeAvatarPosition : "(no avatar)"}</dd>
      </dl>
    </div>;
  },

  toggleShowRegions: function (e) {
    e.preventDefault();
    this.setState({showRegions: !this.state.showRegions});
    var game = this.props.game;
    game.renderer.debug = !game.renderer.debug;
  }
});
