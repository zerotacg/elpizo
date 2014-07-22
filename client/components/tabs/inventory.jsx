/** @jsx React.DOM */

module React from "react";

class _InventoryTab {
  render() {
    return <div id="inventory">
      <div className="spread">
        <div className="name">Inventory</div>
      </div>
    </div>;
  }
}
var InventoryTab = React.createClass(_InventoryTab.prototype);
export default = InventoryTab;
