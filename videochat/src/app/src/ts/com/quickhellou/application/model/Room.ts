/**
 * Room data object.
 *
 * @export
 * @class Room
 */
export class Room {
  public id: string;
  public link: string;
  public server: string;

  /**
   * Creates an instance of Room.
   *
   * @param {string} id
   * @param {string} link
   * @memberof Room
   */
  constructor(id: string = null, link: string = null) {
    this.id = id;
    this.link = link;
  }
}
