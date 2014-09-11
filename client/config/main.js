module music from "client/config/music"

/**
 * @class client.config.Config
 * main class storing the client side configurations
 * might become a model later on
 */
export class Config {
  constructor() {
    this.music = new music.Music();
  }
}
