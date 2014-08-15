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
    if (!this.props.game.debug) {
      return null;
    }

    var game = this.props.game;

    var viewportBounds = game.renderer.getAbsoluteViewportBounds();
    var cacheBounds = game.renderer.getRegionCacheBounds();

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
      <table className="attrs">
        <tr>
          <th>Viewport Bounds</th>
          <td>({viewportBounds.aLeft.toFixed(2)}, {viewportBounds.aTop.toFixed(2)}, {viewportBounds.aRight.toFixed(2)}, {viewportBounds.aBottom.toFixed(2)})</td>
        </tr>

        <tr>
          <th>Cache Bounds</th>
          <td>({cacheBounds.arLeft.toFixed(2)}, {cacheBounds.arTop.toFixed(2)}, {cacheBounds.arRight.toFixed(2)}, {cacheBounds.arBottom.toFixed(2)})</td>
        </tr>


        <tr>
          <th># Regions Loaded</th>
          <td>
            {game.realm !== null ? game.realm.getAllRegions().length : "(no realm)"} (<a href="#" onClick={this.toggleShowRegions}>{this.state.showRegions ? "hide" : "show"}</a>)
            {maybeRegions}
          </td>
        </tr>

        <tr>
          <th># Entities Loaded</th>
          <td>{game.realm !== null ? game.realm.getAllEntities().length : "(no realm)"}</td>
        </tr>

        <tr>
          <th>Avatar Position</th>
          <td>{maybeAvatarPosition !== null ? maybeAvatarPosition : "(no avatar)"}</td>
        </tr>

        <tr>
          <th><a href="/_debug/" target="_blank">Debug Console</a></th>
          <td>
            <a href={game.me !== null ? "/_debug/entities/" + game.me.id + "/" : null} target="_blank">Avatar</a>/
            <a href={game.realm !== null ? "/_debug/realms/" + game.realm.id + "/" : null} target="_blank">Realm</a>
          </td>
        </tr>
      </table>
    </div>;
  },

  toggleShowRegions: function (e) {
    e.preventDefault();
    this.setState({showRegions: !this.state.showRegions});
  },
});
