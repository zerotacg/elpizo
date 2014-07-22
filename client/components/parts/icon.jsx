/** @jsx React.DOM */

module React from "react";

import {classSet} from "../../util/react";
module names from "../../constants/names";

class _Icon {
  render() {
    var classes = {
      icon: true
    };

    classes["taxonomy-" + this.props.taxonomy] = true;
    classes["kind-" + names[this.props.taxonomy][this.props.kind]] = true;
    classes["variant-" + this.props.variant] = true;

    return <span className={classSet(classes)} />;
  }
}

var Icon = React.createClass(_Icon.prototype);
export default = Icon;
