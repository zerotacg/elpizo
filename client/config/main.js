import { Music } from "client/config/music"

/**
 * @class client.config.Config
 * main class storing the client side configurations
 * might become a model later on
 */
export class Config {
  constructor()
  {
    this._music = new Music();
  }


  getMusic() {
    return this._music;
  }
}