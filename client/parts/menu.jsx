/** @jsx React.DOM */

module React from "react";

class _Menu {
  render() {
    var items = this.props.items.map(function (item) {
      return <li key={item.id}><a href="#"
                                  onClick={this.onClick.bind(this, item.id)}>
        {item.title} <small>{item.subtitle}</small></a>
      </li>;
    }.bind(this));

    return <ul className="menu">{items}</ul>;
  }

  onClick(id, e) {
    e.preventDefault();
    this.props.onItemClick(id);
  }
}
var Menu = React.createClass(_Menu.prototype);
export default = Menu;
