/** @jsx React.DOM */

module React from "react";

class _PropertyTab {
  render() {
    return <div id="quests">
      <div className="spread">
        <div className="name">{this.props.playerName}'s Property</div>
      </div>
    </div>;
  }
}
var PropertyTab = React.createClass(_PropertyTab.prototype);
export default = PropertyTab;
