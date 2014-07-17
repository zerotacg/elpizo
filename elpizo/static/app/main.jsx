"use strict";

var net = require("./net");

var App = require("./app.jsx");

React.renderComponent(
    <App transport={new net.Transport("/events")} />,
    document.getElementById("elpizo"));
