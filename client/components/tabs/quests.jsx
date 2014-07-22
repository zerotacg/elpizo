/** @jsx React.DOM */

module React from "react";

class _QuestsTab {
  render() {
    return <div id="quests">
      <div className="spread">
        <div className="name">Quests</div>
      </div>
    </div>;
  }
}
var QuestsTab = React.createClass(_QuestsTab.prototype);
export default = QuestsTab;
