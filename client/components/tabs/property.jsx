/** @jsx React.DOM */

module React from "react";

class _PropertyTab {
  render() {
    return <div id="property">
      <div className="spread">
        <div className="name">Property</div>
      </div>
    </div>;
  }
}
var PropertyTab = React.createClass(_PropertyTab.prototype);
export default = PropertyTab;
