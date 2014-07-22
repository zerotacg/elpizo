import {Promise} from "es6-promise";

module net from "./util/net";

function httpJson(url, method, body) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url, true);

    xhr.onload = function (e) {
      if (xhr.status >= 400) {
        reject(new Error(xhr.statusText));
      } else {
        resolve(JSON.parse(xhr.responseText));
      }
    };

    xhr.onerror = function (e) {
      reject(new Error(e));
    }

    xhr.send(body ? JSON.stringify(body) : null)
  });
}

function openProto(channel) {
  return new net.Protocol(channel, net.transport);
}

export var getPlayer = httpJson.bind(null, "/player", "GET");
export var getExplore = httpJson.bind(null, "/explore", "GET");
export var postExploreMove = httpJson.bind(null, "/explore/move", "POST");
export var openExplore = openProto.bind(null, "explore");
export var openChat = openProto.bind(null, "chat");
