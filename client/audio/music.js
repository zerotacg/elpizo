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

  update() {
    var audio = this.audio;
    var config = this.config;
    audio.volume = config.volume;
    audio.muted = config.muted;

    // TODO: get theme to play from current region
    var theme = "ehren-paper_lights-64";
    this.setTheme( theme );
  }

  /**
   * set the theme to play
   * @param {string} theme
   */
  setTheme(theme) {
    if( this.theme === theme ) return;

    this.theme = theme;
    var audio = this.audio;
    var name = this.getResourceName(theme);
    var resource = this.resources.get(name);
    if( resource !== null )
    {
      audio.src = resource.src;
      audio.load();
      audio.play();
    }
    else
    {
      audio.pause();
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

  createAudio() {
    var audio = new Audio();
    audio.loop = true;
    return audio;
  }
}
