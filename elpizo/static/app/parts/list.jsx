"use strict;"

var Menu = require("./menu.jsx");

var util = require("../util");

var Square = React.createClass({
  getInitialState: function () {
    return {
      active: false
    };
  },

  render: function () {
    return <li className={this.state.active ? "active" : ""}>
      <div className="square">
        {this.props.icon}
        <div className="tooltip">
          <div className="name">
            {this.props.title} <small>{this.props.subtitle}</small>
          </div>
          {this.props.menu}
        </div>
      </div>
    </li>;
  },

  onClick: function () {
    this.setState({
      active: !this.state.active
    });
  }
});

var Card = React.createClass({
  getInitialState: function () {
    return {
      active: false
    };
  },

  render: function () {
    return <li className={this.state.active ? "active" : ""}
               key={this.props.id}>
      <div className="row card" onClick={this.onClick}>
        <div className="col">
          {this.props.icon}
        </div>
        <div className="name col">
          {this.props.title} <small>{this.props.subtitle}</small>
        </div>
      </div>
      <div className="row">
        <div className="col full">
          {this.props.menu}
          <Menu items={[
            {title: "Talk", subtitle: "", id: "talk"},
            {title: "Tame", subtitle: "Beastmastery 100", id: "tame"},
            {title: "Info", subtitle: "", id: "info"}
          ]} />
        </div>
      </div>
    </li>;
  },

  onClick: function () {
    this.setState({active: !this.state.active});
  }
});

var List = React.createClass({
  getFactory: function () {
    switch (this.props.type) {
      case "card": return Card;
      case "square": return Square;
    }
   },

  render: function () {
    var ListItem = this.getFactory();

    var items = this.props.items.map(function (item) {
      return ListItem(util.extend({key: item.id}, item));
    });

    return <ul className="list">{items}</ul>;
  }
});

module.exports = List;
