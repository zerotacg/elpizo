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
    snd.addEventListener( 'canplaythrough', () => resolve(snd) );
    snd.onerror = (err) => reject(new Error(err));
    return snd;
  });
}

export class Resources extends events.EventEmitter {
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
