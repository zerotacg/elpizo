"use strict;"

var Menu = require("./menu.jsx");

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
          <Menu items={[
            {title: "Pick up", subtitle: "", id: "pickUp"},
            {title: "Info", subtitle: "", id: "info"}
          ]} />
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
      return <ListItem title={item.title} subtitle={item.subtitle}
                       key={item.id} icon={item.icon} />;
    }.bind(this));

    return <ul className="list">{items}</ul>;
  }
});

module.exports = List;
