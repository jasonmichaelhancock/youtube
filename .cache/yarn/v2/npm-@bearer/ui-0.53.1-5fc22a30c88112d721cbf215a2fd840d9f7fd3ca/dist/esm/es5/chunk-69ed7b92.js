var FieldSet = /** @class */ (function () {
    function FieldSet(e) {
        this.set = e;
    }
    FieldSet.prototype.get = function (e) { return this.set.find(function (t) { return t.controlName === e; }); };
    FieldSet.prototype.getValue = function (e) { return this.get(e).value; };
    FieldSet.prototype.setValue = function (e, t) { this.set.map(function (r) { return r.controlName === e ? (r.value = t, r) : r; }); };
    FieldSet.prototype.map = function (e) { return this.set.map(e); };
    FieldSet.prototype.reduce = function (e) { return this.set.reduce(e); };
    FieldSet.prototype.filter = function (e) { return this.set.filter(e); };
    return FieldSet;
}());
export { FieldSet as a };
