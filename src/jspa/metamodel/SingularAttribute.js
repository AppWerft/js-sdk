jspa.metamodel.SingularAttribute = jspa.metamodel.Attribute.inherit({
	
	typeConstructor: {
		get: function() {
			return this.type.typeConstructor;
		}
	},
	
	initialize: function(declaringType, name, type) {
		this.superCall(declaringType, name);
		
		this.type = type;
		
		switch (type.persistenceType) {
			case jspa.metamodel.Type.PersistenceType.BASIC:				
				this.persistentAttributeType = jspa.metamodel.Attribute.PersistentAttributeType.BASIC;
				break;
			case jspa.metamodel.Type.PersistenceType.EMBEDDABLE:
				this.persistentAttributeType = jspa.metamodel.Attribute.PersistentAttributeType.EMBEDDED;
				break;
			case jspa.metamodel.Type.PersistenceType.ENTITY:
				this.persistentAttributeType = jspa.metamodel.Attribute.PersistentAttributeType.ONE_TO_MANY;
				break;
		}
	},
	
	getDatabaseValue: function(state) {
		return this.type.toValue(state, this.getValue(state.entity));
	},
	
	setDatabaseValue: function(state, json) {
		this.setValue(state.entity, this.type.fromValue(state, json));
	}
});