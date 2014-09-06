module events from "events";
module promise from "es6-promise";

export function loadImage(src) {
  return new promise.Promise((resolve, reject) => {
    var img = new Image();
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error(err));
    return img;
  });
}

export function loadAudio(src) {
  return new promise.Promise((resolve, reject) => {
    var snd = new Audio();
    snd.src = src;
    snd.oncanplaythrough = () => resolve(snd);
    snd.onerror = (err) => reject(new Error(err));
    snd.load();
    return snd;
  });
}

export class Resources extends events.EventEmitter {
  constructor() {
    super();

    this._resources = {};
    this.resourcesPending = {};
  }

  getNumResourcesPending() {
    return Object.keys(this.resourcesPending).length;
  }

  getNumResourcesLoaded() {
    return this.getNumResources() - this.getNumResourcesPending();
  }

  getNumResources() {
    return Object.keys(this._resources).length + this.getNumResourcesPending();
  }

  isLoadingComplete() {
    return Object.keys(this.resourcesPending).length === 0;
  }

  load(name, promise) {
    this.resourcesPending[name] = promise;

    return promise.then((resource) => {
      this._resources[name] = resource;
      this.emit("resourceLoaded", {name: name, resource: resource});
      delete this.resourcesPending[name];
      return resource;
    });
  }

  loadBundle(bundle) {
    var keys = Object.keys(bundle);
    this.numResources += keys.length;

    return promise.Promise.all(keys.map((key) =>
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
    image: loadImage,
    audio: loadAudio
};
