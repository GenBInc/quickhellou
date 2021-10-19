/**
 * File data wrapper
 * 
 * @export
 * @class FileDataObject
 */
export class FileDataObject {
    
    /**
     * File name
     * 
     * @private
     * @type {string}
     * @memberof FileDataObject
     */
    private fileName:string;
    
    /**
     * File path
     * 
     * @private
     * @type {string}
     * @memberof FileDataObject
     */
    private filePath:string;

    /**
     * Creates an instance of FileDataObject.
     * 
     * @param {string} [fileName] 
     * @param {string} [filePath] 
     * @memberof FileDataObject
     */
    constructor(fileName?:string, filePath?:string) {
        this.fileName = fileName;
        this.filePath = filePath;
    }

    /**
     * Gets file name.
     * 
     * @returns {string} 
     * @memberof FileDataObject
     */
    getFileName():string {
        return this.fileName;
    }

    /**
     * Sets file name.
     * 
     * @param {string} fileName 
     * @memberof FileDataObject
     */
    setFileName(fileName:string) {
        this.fileName = fileName;
    }

    /**
     * Gets file path.
     * 
     * @returns {string} 
     * @memberof FileDataObject
     */
    getFilePath():string {
        return this.filePath;
    }

    /**
     * Sets file path.
     * 
     * @param {string} filePath 
     * @memberof FileDataObject
     */
    setFilePath(filePath:string) {
        this.filePath = filePath;
    }
}