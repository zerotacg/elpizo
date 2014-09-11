/**
 * @class client.audio.Music
 */
export class Music {
  /**
   * @property {client.config.Music} config
   */
  /**
   * @property {string} theme
   *   the currently playing theme
   */
  /**
   * @property {Audio} audio
   */

  /**
   * @constructor
   * @param {client.config.Music} config
   * @param resources
   */
  constructor(config, resources) {
    this.config = config;
    this.resources = resources;
    this.audio = this.createAudio();
    this.theme = null;
  }

  update(player, dt) {
    var audio = this.audio;
    var config = this.config;
    audio.volume = config.volume;
    audio.muted = config.muted;

    var theme = this.findTheme(player);
    this.setTheme(theme);
  }

  /**
   * set the theme to play
   * @param {string} theme
   */
  setTheme(theme) {
    if (this.theme === theme) {
      return;
    }

    this.theme = theme;
    var audio = this.audio;
    var name = this.getResourceName(theme);
    var resource = this.resources.get(name);
    if (resource == null) { // maybe use === ? is resource guranteed to be null?
      audio.pause();
    } else {
      audio.src = resource.src;
      audio.load();
      audio.play(); // maybe only play on canplay or canplaytrhough event?
    }
  }

  /**
   * get a resource name for given theme
   * @param {string} theme
   * @returns {string}
   */
  getResourceName(theme) {
    return "music/" + theme + ".opus";
  }

  /**
   * find the theme for the players current location
   * @param player
   * @returns {string}
   */
  findTheme(player) {
    // TODO: get theme to play from current region
    return "ehren-paper_lights-64";
  }

  createAudio() {
    var audio = new Audio();
    audio.loop = true;

    return audio;
  }
}
