export class FieldSet {
    constructor(set) {
        this.set = set;
    }
    get(controlName) {
        return this.set.find(el => el.controlName === controlName);
    }
    getValue(controlName) {
        return this.get(controlName).value;
    }
    setValue(controlName, value) {
        this.set.map(el => {
            if (el.controlName === controlName) {
                el.value = value;
                return el;
            }
            return el;
        });
    }
    map(func) {
        return this.set.map(func);
    }
    reduce(func) {
        return this.set.reduce(func);
    }
    filter(func) {
        return this.set.filter(func);
    }
}
