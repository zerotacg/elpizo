/** @jsx React.DOM */

module React from "react";

import {classSet} from "../util/react";

class _Bar {
  render() {
    var classes = {
        bar: true
    };

    classes[this.props.className] = true;

    return <div className={classSet(classes)}>
      <div className="fill" style={{width: Math.round(this.props.value / this.props.max * 100) + "%"}}></div>
      <div className="caption">{this.props.value} / {this.props.max}</div>
    </div>;
  }
}
var Bar = React.createClass(_Bar.prototype);

export default = Bar;
