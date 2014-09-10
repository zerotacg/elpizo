/**
 * @class client.config.Music
 * configuration class storing all background music related settings
 */
export class Music {
  constructor() {
    this._volume = 1;
    this._muted = false;
  }

  getVolume()
  {
    return this._volume;
  }

  isMuted()
  {
    return this._muted;
  }
}