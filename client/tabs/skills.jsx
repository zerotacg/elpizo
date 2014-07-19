/** @jsx React.DOM */

module React from "react";

class _SkillsTab {
  render() {
    return <div id="quests">
      <div className="spread">
        <div className="name">{this.props.playerName}'s Skills</div>
      </div>
    </div>;
  }
}
var SkillsTab = React.createClass(_SkillsTab.prototype);
export default = SkillsTab;
