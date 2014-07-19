module net from "./net";

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

function openProto(channel, transport) {
  return new net.Protocol(channel, transport);
}

export default = {
  getPlayer: httpJson.bind(null, "/player", "GET"),
  getExploreNearby: httpJson.bind(null, "/explore/nearby", "GET"),
  openExplore: openProto.bind(null, "explore"),
  openChat: openProto.bind(null, "chat")
};
