import { ArrayUtils } from "../utils/ArrayUtils";

export class FormSerializableObject {
    
    public static FORM_NO:string = "1";
    public static TEMPLATE_NO:string = "2";

    serializedData:Array<object>;
    
    /**
     * Creates an instance of FormSerializableObject.
     * 
     * @memberof FormSerializableObject
     */
    constructor() {
        this.setSerializedData(new Array<object>());
    }

    /**
     * Serializes text data.
     * 
     * @returns {FormData} 
     * @memberof FormSerializableObject
     */
    public serializeTextData():FormData {
        
        let formData:FormData = new FormData();

        for (let key in this.getKeys()) {
            formData.append(this.getKeys()[key], this.getValues()[key]);
        }

        return formData;
    }

    serializeArray(array:Array<any>):FormData {
        
        let formData:FormData = new FormData();

        for (let key of array) {
            formData.append(<string>(key["name"]), <string>(key["value"]));
        }

        return formData;
    }
    // TODO
    //serializeJQueryInputs() {
        /*let formData:FormData = new FormData();
        
        for (let key in this.getKeys()) {
            let element:JQuery = $("input[name='"+ this.getKeys()[key] +"']");
            let elementType:string = element.attr("type");

            if (elementType === "text")
                formData.append(this.getKeys()[key], element.val());
            else if (elementType === "file"){
                let fileList:any = <any>(element[0].files);
                let blob:Blob = new Blob(fileList);
                formData.append(this.getKeys()[key], blob);
            }
        }

        return formData;*/
    //}

    protected getKeys():Array<string> {
        return [];
    }

    protected getValues():Array<string> {
        return [];
    }

    getSerializedFormData():FormData {
        if (!ArrayUtils.isEmpty(this.getSerializedData()))
            return this.serializeArray(this.getSerializedData());
        else
            return this.serializeTextData();
    }

    getSerializedData():Array<object> {
        return this.serializedData;
    }

    setSerializedData(serializedData:Array<object>) {
        this.serializedData = serializedData;
    }
}
        