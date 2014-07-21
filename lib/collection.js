exports.StopIteration = Error.inherit({
  initialize: function () {
    this.superCall('No such element.');
  }
});

exports.Iterator = Trait.inherit({
  extend: {
    conv: function (obj) {
      if (obj) {
        if (obj.items && Function.isInstance(obj.items)) {
          return obj.items();
        } else if (Array.isInstance(obj)) {
          return new exports.IndexIterator(obj.length, function (index) {
            return [index, obj[index]];
          });
        } else {
          return new exports.PropertyIterator(obj);
        }
      }
    }
  },

  StopIteration: new exports.StopIteration(),
  hasNext: false,

  iterator: function () {
    return this;
  },

  next: function () {
    throw this.StopIteration;
  }
});

exports.IndexIterator = Object.inherit(exports.Iterator, {
  initialize: function (length, accessor) {
    this.length = length;
    this.index = 0;

    this.hasNext = this.index < this.length;

    if (accessor)
      this.accessor = accessor;
  },
  next: function () {
    if (!this.hasNext)
      throw this.StopIteration;

    var value = this.accessor(this.index);
    this.hasNext = ++this.index < this.length;

    return value;
  }
});

exports.PropertyIterator = exports.IndexIterator.inherit({
  initialize: function (obj) {
    this.obj = obj;
    this.names = Object.getOwnPropertyNames(obj);
  },
  accessor: function (index) {
    if (this.names.length >= index)
      throw this.StopIteration;

    var name = this.names[index];
    return [name, this.object[name]];
  }
});

exports.Iterable = Trait.inherit({
  forEach: function (callback, thisArg) {
    if (!callback || !Function.isInstance(callback)) {
      throw new TypeError(callback + ' is not a function');
    }

    for (var iter = exports.Iterator(this); iter.hasNext;) {
      var item = iter.next();

      callback.call(thisArg, item[1], item[0], this);
    }
  },

  every: function (callback, thisArg) {
    if (!callback || !Function.isInstance(callback)) {
      throw new TypeError(callback + ' is not a function');
    }

    for (var iter = exports.Iterator(this); iter.hasNext;) {
      var item = iter.next();

      if (!callback.call(thisArg, item[1], item[0], this))
        return false;
    }

    return true;
  },

  some: function (callback, thisArg) {
    if (!Function.isInstance(callback)) {
      throw new TypeError(callback + ' is not a function');
    }

    for (var iter = exports.Iterator(this); iter.hasNext;) {
      var item = iter.next();

      if (callback.call(thisArg, item[1], item[0], this))
        return true;
    }

    return false;
  },

  filter: function (callback, thisArg) {
    if (!Function.isInstance(callback)) {
      throw new TypeError(callback + ' is not a function');
    }

    var result = new this.constructor();
    for (var iter = exports.Iterator(this); iter.hasNext;) {
      var item = iter.next();

      if (callback.call(thisArg, item[1], item[0], this)) {
        if (result.set) {
          result.set(item[0], item[1]);
        } else {
          result.add(item[1]);
        }
      }
    }

    return result;
  },

  map: function (callback, thisArg) {
    if (!Function.isInstance(callback)) {
      throw new TypeError(callback + ' is not a function');
    }

    var result = new this.constructor();
    for (var iter = exports.Iterator(this); iter.hasNext;) {
      var item = iter.next();

      item = callback.call(thisArg, item[1], item[0], this);
      if (result.set) {
        result.set(item[0], item[1]);
      } else {
        result.add(item[1]);
      }
    }

    return result;
  },

  reduce: function (callback, previousValue) {
    if (!Function.isInstance(callback)) {
      throw new TypeError(callback + ' is not a function');
    }

    var iter = exports.Iterator(this);
    if (arguments.length == 1) {
      previousValue = iter.next()[1];
    }

    while (iter.hasNext) {
      item = iter.next();

      previousValue = callback.call(null, previousValue, item[1], item[0], this);
    }

    return previousValue;
  }
});

exports.Collection = Object.inherit(exports.Iterable, {
  extend: {
    conv: function (items) {
      if (items) {
        if (Array.isInstance(items)) {
          var col = new this();
          for (var i = 0, len = items.length; i < len; ++i) {
            col.add(items[i]);
          }

          return col;
        } else if (exports.Collection.isInstance(items)) {
          return new this(items);
        }
      }

      return null;
    }
  },

  size: 0,
  seq: [],

  initialize: function (collection) {
    this.seq = [];
    this.size = 0;
    if (collection) {
      for (var iter = collection.iterator(); iter.hasNext;) {
        this.add(iter.next());
      }
    }
  },

  has: function (element) {
    return this.seq.indexOf(element) != -1;
  },

  add: function (element) {
    this.seq[this.size++] = element;
  },

  remove: function (element) {
    var index = this.seq.indexOf(element);
    if (index > -1) {
      this.seq.splice(index, 1);
      this.size--;
    }
  },

  items: function () {
    var seq = this.seq;
    return new exports.IndexIterator(this.size, function (index) {
      return [index, seq[index]];
    });
  },

  iterator: function () {
    var seq = this.seq;
    return new exports.IndexIterator(this.size, function (index) {
      return seq[index];
    });
  },

  toString: function () {
    return this.seq.toString();
  },

  toJSON: function () {
    return this.seq;
  }
});

exports.List = exports.Collection.inherit({
  extend: {
    conv: exports.Collection.conv
  },

  get: function (index) {
    if (index < 0) {
      index = this.size + index;
    }

    if (index >= 0 && index < this.size) {
      return this.seq[index];
    }
  },

  set: function (index, value) {
    if (index < 0) {
      index = this.size + index;
    }

    if (index < 0) {
      this.seq.unshift(value);
      this.size++;
    } else if (index >= this.size) {
      this.seq.push(value);
      this.size++;
    } else {
      this.seq[index] = value;
    }
  },

  indexOf: function (value) {
    return this.seq.indexOf(value);
  },

  lastIndexOf: function (value) {
    return this.seq.lastIndexOf(value);
  }
});

exports.Set = exports.Collection.inherit({
  extend: {
    conv: exports.Collection.conv
  },

  add: function (value) {
    var index = this.seq.indexOf(value);
    if (index < 0) {
      this.seq[this.size++] = value;
    }
  }
});

exports.Map = exports.Collection.inherit({
  extend: {
    conv: function (items) {
      if (items) {
        if (Array.isInstance(items)) {
          var map = new this();
          for (var i = 0, item; item = items[i]; ++i) {
            if ('key' in item && 'value' in item) {
              map.set(item['key'], item['value']);
            } else {
              break;
            }
          }

          if (map.size == items.length)
            return map;
        } else if (exports.Collection.isInstance(items)) {
          return new this(items);
        }
      }

      return null;
    }
  },

  initialize: function (collection) {
    this.vals = [];

    if (exports.Map.isInstance(collection)) {
      this.superCall();
      for (var iter = collection.items(); iter.hasNext;) {
        var item = iter.next();
        this.set(item[0], item[1]);
      }
    } else {
      this.superCall(collection);
    }
  },

  get: function (key) {
    var index = this.seq.indexOf(key);
    if (index > -1) {
      return this.vals[index];
    }
  },

  add: function (key) {
    this.set(key);
  },

  set: function (key, value) {
    var index = this.seq.indexOf(key);
    if (index < 0) {
      index = this.seq.length;
      this.seq[index] = key;
      this.size++;
    }

    this.vals[index] = value;
  },

  remove: function (key) {
    var index = this.seq.indexOf(key);
    if (index > -1) {
      this.seq.splice(index, 1);
      this.vals.splice(index, 1);
      this.size--;
    }
  },

  items: function () {
    var map = this;
    return new exports.IndexIterator(this.size, function (index) {
      return [map.seq[index], map.vals[index]];
    });
  },

  keys: function () {
    return this.iterator();
  },

  values: function () {
    var map = this;
    return new exports.IndexIterator(this.size, function (index) {
      return map.seq[index];
    });
  },

  toString: function () {
    var str = '';
    for (var i = 0, len = this.size; i < len; ++i) {
      if (str != '')
        str += ', ';

      str += this.seq[i];
      str += ': ';
      str += this.vals[i];
    }
    return '[' + str + ']';
  },

  toJSON: function () {
    var map = [];
    for (var i = 0, len = this.size; i < len; ++i) {
      map.push({
        key: this.seq[i],
        value: this.vals[i]
      });
    }
    return map;
  }
});