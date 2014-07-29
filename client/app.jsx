/** @jsx React.DOM */

module React from "react";

import {Transport, Protocol} from "./util/net";

class _App {
  getInitialState() {
    return {
        protocol: new Protocol(new Transport("/sockjs"))
    };
  }

  render() {
    return <div></div>;
  }
}
var App = React.createClass(_App.prototype);

export default = App;
