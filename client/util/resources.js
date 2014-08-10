import {EventEmitter} from "events";
import {Promise} from "es6-promise";

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    var img = new Image();
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error(err));
    return img;
  });
}

export class Resources extends EventEmitter {
  constructor() {
    super();
    this._resources = {};
  }

  load(name, promise) {
    return promise.then((resource) => {
      this._resources[name] = resource;
      this.emit("resourceLoaded", {name: name, resource: resource});
      return resource;
    });
  }

  loadBundle(bundle) {
    var keys = Object.keys(bundle);
    return Promise.all(keys.map((key) =>
        this.load(key, bundle[key]))).then(() => {
      var resources = keys.map((k) => this._resources[k]);
      this.emit("bundleLoaded", resources);
      return resources;
    });
  }

  get(name) {
    return this._resources[name] || null;
  }
}

Resources.TYPES = {
    image: loadImage
};
