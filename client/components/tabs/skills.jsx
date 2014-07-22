/** @jsx React.DOM */

module React from "react";

class _SkillsTab {
  render() {
    return <div id="skills">
      <div className="spread">
        <div className="name">Skills</div>
      </div>
    </div>;
  }
}
var SkillsTab = React.createClass(_SkillsTab.prototype);
export default = SkillsTab;
