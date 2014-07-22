/** @jsx React.DOM */

module React from "react";

class _List {
  render() {
    return <div className="list">
      <ul className="items">{this.props.items}</ul>
    </div>;
  }
}
var List = React.createClass(_List.prototype);
export default = List;
