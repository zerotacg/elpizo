"use strict;"

var Icon = React.createClass({
  render: function () {
    return <div className={"taxonomy-" + this.props.taxonomy + " " +
                           "kind-" + this.props.kind + " " +
                           "variant-" + this.props.variant + " " +
                           this.props.size + " icon"}></div>;
  }
});

module.exports = Icon;
