export class KeyValuePair {
		
	private key:any;
	private value:any;
		
	constructor(key:any, value:any) {
		this.key = key;
		this.value = value;
	}
		
		
	getKey() {
		return this.key;
	}
		
	getValue() {
		return this.value;
	}
}