var Attribute = require('./Attribute');
var Type = require('./Type');

/**
 * @class baqend.metamodel.SingularAttribute
 * @extends baqend.metamodel.Attribute
 */
var SingularAttribute = Attribute.inherit(/** @lends baqend.metamodel.SingularAttribute.prototype */ {

  get typeConstructor() {
    return this.type.typeConstructor;
  },

  /**
   * @type baqend.metamodel.Type
   */
  type: null,

  /**
   * @param {String} name
   * @param {baqend.metamodel.Type} type
   */
  constructor: function SingularAttribute(name, type) {
    Attribute.call(this, name);

    this.type = type;

    switch (type.persistenceType) {
      case Type.PersistenceType.BASIC:
        this.persistentAttributeType = Attribute.PersistentAttributeType.BASIC;
        break;
      case Type.PersistenceType.EMBEDDABLE:
        this.persistentAttributeType = Attribute.PersistentAttributeType.EMBEDDED;
        break;
      case Type.PersistenceType.ENTITY:
        this.persistentAttributeType = Attribute.PersistentAttributeType.ONE_TO_MANY;
        break;
    }
  },

  /**
   * Gets this attribute value form the object as json
   * @param {baqend.util.Metadata} state The root object state
   * @param {*} object The object which contains the value of this attribute
   * @return {*} The converted json value
   */
  getDatabaseValue: function (state, object) {
    return this.type.toDatabaseValue(state, this.getValue(object));
  },

  /**
   * Sets this attribute value from json to the object
   * @param {baqend.util.Metadata} state The root state
   * @param {*} object The object which contains the attribute
   * @param {*} jsonValue The json value to convert an set
   */
  setDatabaseValue: function (state, object, jsonValue) {
    this.setValue(object, this.type.fromDatabaseValue(state, jsonValue, this.getValue(object)));
  },

  /**
   * {@inheritDoc}
   * @returns {Object} {@inheritDoc}
   */
  toJSON: function() {
    return {
      name: this.name,
      type: this.type.ref,
      order: this.order
    }
  }
});

module.exports = SingularAttribute;