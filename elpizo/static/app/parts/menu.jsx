"use strict";

var Menu = React.createClass({
  render: function () {
    var items = this.props.items.map(function (item) {
      return <li key={item.id}><a href="#"
                                  onClick={this.onClick.bind(this, item.id)}>
        {item.title} <small>{item.subtitle}</small></a>
      </li>;
    }.bind(this));

    return <ul className="menu">{items}</ul>;
  },

  onClick: function (id) {
    this.props.onItemClick(id);
  }
});

module.exports = Menu;
