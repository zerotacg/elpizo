export function loadImage(src) {
  return new Promise((resolve, reject) => {
    var img = new Image();
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error(err));
    return img;
  });
}

export class Resources {
  constructor() {
    this._resources = {};
  }

  load(name, promise) {
    return promise.then((resource) => {
      this._resources[name] = resource;
      return resource;
    });
  }

  loadBundle(bundle) {
    var keys = Object.keys(bundle);
    return Promise.all(keys.map((key) => this.load(key, bundle[key])));
  }

  get(name) {
    return this._resources[name] || null;
  }
}
