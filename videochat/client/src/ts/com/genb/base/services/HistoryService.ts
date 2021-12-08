import { EventDispatcherService } from "../../base/services/EventDispatcherService";

/**
 * Browser history service.
 * 
 * @export
 * @class HistoryService
 * @extends {EventDispatcherService}
 */
export class HistoryService extends EventDispatcherService {
    private appHistory:Array<object>;

    /**
     * Replace current state with a new state.
     * 
     * @param {string} name 
     * @param {string} url 
     * @memberof HistoryService
     */
    public replaceCurrentState(name:string, url:string):void {
        history.replaceState(this.getTemporaryStateObject(), name, url);
    }

    /**
     * Gets a temporary state object.
     * 
     * @private
     * @returns {object} 
     * @memberof HistoryService
     */
    private getTemporaryStateObject():object {
        return {foo:"bar"};
    }
}