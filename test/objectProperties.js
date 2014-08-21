var myObj = {};

Object.defineProperty(myObj, 'attr2', {
    get: function () {
        return attr2;
    },
    set: function (val) {
        if (typeof (val) === 'string') {
            attr2 = val;
        }
    }
});

myObj.attr2 = "this is new";