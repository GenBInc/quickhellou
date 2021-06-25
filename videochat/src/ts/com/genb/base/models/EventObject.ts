import { StringUtils } from "../utils/StringUtils";

/**
 * Event object
 * 
 * @export
 * @class EventObject
 */
export class EventObject {
	
    static COMPLETE:string = "complete";
       
	/**
	 * Event type.
	 * 
	 * @type {string}
	 * @memberof EventObject
	 */
	public type:string;

	/**
	 * Event data.
	 * 
	 * @private
	 * @type {*}
	 * @memberof EventObject
	 */
	private data:any;
		
	/**
	 * Creates an instance of EventObject.
	 * 
	 * @param {string} type 
	 * @param {*} [data] 
	 * @memberof EventObject
	 */
	constructor(type:string, data?:any) {
		this.type = type;
            
        if (StringUtils.isDefined(data))
            this.setData(data);
	}

	/**
	 * Gets an event type.
	 * 
	 * @returns {string} 
	 * @memberof EventObject
	 */
	getType():string {
		return this.type;
	}

	/**
	 * Sets an event type.
	 * 
	 * @param {string} type 
	 * @memberof EventObject
	 */
	setType(type:string) {
		this.type = type;
	}

	/**
	 * Gets a data.
	 * 
	 * @returns {*} 
	 * @memberof EventObject
	 */
	getData():any {
		return this.data;
	}

	/**
	 * Sets a data.
	 * 
	 * @param {*} data 
	 * @memberof EventObject
	 */
	setData(data:any) {
		this.data = data;
	}
}