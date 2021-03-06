if (typeof DB == 'undefined') {
  env = require('./env');
  var chai = require("chai");
  var chaiAsPromised = require("chai-as-promised");
  chai.use(chaiAsPromised);
  chai.config.includeStack = true;
  expect = chai.expect;
  DB = require('../lib');
}

describe('Test Acl', function() {

  var db, emf;
  before(function() {
    emf = new DB.EntityManagerFactory(env.TEST_SERVER);
    var metamodel = emf.metamodel;
    return metamodel.load().then(function() {
      if(!metamodel.managedType("AclPerson")) {
        var AclPerson = new DB.metamodel.EntityType("AclPerson", metamodel.entity(Object));
        AclPerson.addAttribute(new DB.metamodel.SingularAttribute("name", metamodel.baseType(String)));
        AclPerson.addAttribute(new DB.metamodel.SingularAttribute("age", metamodel.baseType(Number)));
        metamodel.addType(AclPerson);
        return saveMetamodel(metamodel, false);
      }
    }).then(function() {
      return createUserDb().then(function(em) {
        db = em;
      });
    });
  });

  after(function() {
    var user = db.User.me;
    return user.delete();
  });

  function createUserDb() {
    var em = emf.createEntityManager();
    return em.User.register(makeLogin(), 'secret').then(function() {
      return em;
    });
  }

  describe('Object', function() {

    it('should be created with an empty rule set', function() {
      var acl = db.AclPerson().acl;

      expect(acl.isPublicReadAllowed()).be.true;
      expect(acl.isPublicWriteAllowed()).be.true;
      expect(acl.isReadAllowed(db.User.me)).be.false;
      expect(acl.isWriteAllowed(db.User.me)).be.false;
      expect(acl.isReadDenied(db.User.me)).be.false;
      expect(acl.isWriteDenied(db.User.me)).be.false;
    });

    it('should return all refs', function() {
      var acl = db.AclPerson().acl
          .allowReadAccess(db.User.me)
          .denyWriteAccess(db.User.me);

      expect(acl.read.allRules()).eql([db.User.me._metadata.ref]);
      expect(acl.write.allRules()).eql([db.User.me._metadata.ref]);
    });

    it('should return the actual rule', function() {
      var acl = db.AclPerson().acl
          .allowReadAccess(db.User.me)
          .denyWriteAccess(db.User.me);

      expect(acl.read.getRule(db.User.me)).eql('allow');
      expect(acl.write.getRule(db.User.me)).eql('deny');

      acl.denyReadAccess(db.User.me);
      acl.deleteWriteAccess(db.User.me);

      expect(acl.read.getRule(db.User.me)).eql('deny');
      expect(acl.write.getRule(db.User.me)).be.undefined;
    });

    it('deny rule should remove allow rule', function() {
      var acl = db.AclPerson().acl;

      acl.allowReadAccess(db.User.me);
      acl.denyReadAccess(db.User.me);

      expect(acl.isReadAllowed(db.User.me)).be.false;
      expect(acl.isReadDenied(db.User.me)).be.true;
    });

    it('allow rule should remove deny rule', function() {
      var acl = db.AclPerson().acl;

      acl.denyReadAccess(db.User.me);
      acl.allowReadAccess(db.User.me);

      expect(acl.isReadAllowed(db.User.me)).be.true;
      expect(acl.isReadDenied(db.User.me)).be.false;
    });

    it('deny rule should be removable', function() {
      var acl = db.AclPerson().acl;

      acl.denyReadAccess(db.User.me);
      acl.deleteReadAccess(db.User.me);

      expect(acl.isReadDenied(db.User.me)).be.false;
      expect(acl.isReadAllowed(db.User.me)).be.false;
    });

    it('allow rule should be removable', function() {
      var acl = db.AclPerson().acl;

      acl.allowReadAccess(db.User.me);
      acl.deleteReadAccess(db.User.me);

      expect(acl.isReadDenied(db.User.me)).be.false;
      expect(acl.isReadAllowed(db.User.me)).be.false;
    });

    it('clear should remove all rules', function() {
      var acl = db.AclPerson().acl;

      acl.allowReadAccess(db.User.me);
      acl.denyWriteAccess(db.User.me);
      acl.clear();

      expect(acl.isPublicReadAllowed()).be.true;
      expect(acl.isPublicWriteAllowed()).be.true;
      expect(acl.isReadAllowed(db.User.me)).be.false;
      expect(acl.isWriteDenied(db.User.me)).be.false;
    });

    it('should be modifiable', function() {
      var role = db.Role();
      role.name = 'AclRole';
      return role.save().then(function() {
        var acl = db.AclPerson().acl
          .allowReadAccess(db.User.me)
          .denyReadAccess(role)
          .denyWriteAccess(db.User.me);

        expect(acl.isPublicReadAllowed()).be.false;
        expect(acl.isPublicWriteAllowed()).be.true;

        expect(acl.isReadAllowed(db.User.me)).be.true;
        expect(acl.isWriteAllowed(db.User.me)).be.false;
        expect(acl.isReadDenied(db.User.me)).be.false;
        expect(acl.isWriteDenied(db.User.me)).be.true;

        expect(acl.isReadAllowed(role)).be.false;
        expect(acl.isWriteAllowed(role)).be.false;
        expect(acl.isReadDenied(role)).be.true;
        expect(acl.isWriteDenied(role)).be.false;
      });
    });

    it('modification should mark the object as dirty', function() {
      var person = db.AclPerson();
      var acl = person.acl;

      person._metadata.setPersistent();
      acl.allowReadAccess(db.User.me);
      expect(person._metadata.isDirty).be.true;

      person._metadata.setPersistent();
      acl.denyReadAccess(db.User.me);
      expect(person._metadata.isDirty).be.true;

      person._metadata.setPersistent();
      acl.deleteReadAccess(db.User.me);
      expect(person._metadata.isDirty).be.true;

      person._metadata.setPersistent();
      acl.allowWriteAccess(db.User.me);
      expect(person._metadata.isDirty).be.true;

      person._metadata.setPersistent();
      acl.denyWriteAccess(db.User.me);
      expect(person._metadata.isDirty).be.true;

      person._metadata.setPersistent();
      acl.deleteWriteAccess(db.User.me);
      expect(person._metadata.isDirty).be.true;

      person._metadata.setPersistent();
      acl.clear();
      expect(person._metadata.isDirty).be.true;
    });
  });

  describe('protected Object operations', function() {
    var db2, db3, role23, role13;
    before(function() {
      return Promise.all([createUserDb(), createUserDb()]).then(function(arr) {
        db2 = arr[0];
        db3 = arr[1];

        role23 = db.Role();
        role23.name = "Role2_3";
        role23.addUser(db.getReference(db2.me._metadata.ref));
        role23.addUser(db.getReference(db3.me._metadata.ref));
        var promise1 = role23.save();

        role13 = db.Role();
        role13.name = "Role1_3";
        role13.addUser(db.User.me);
        role13.addUser(db.getReference(db3.me._metadata.ref));
        var promise2 = role13.save();

        return Promise.all([promise1, promise2]);
      }).then(function() {
        return Promise.all([
          db.renew(),
          db2.renew(),
          db3.renew()
        ]);
      });
    });

    after(function() {
      return Promise.all([
        db2.User.me.delete(),
        db3.User.me.delete()
      ]);
    });

    it('should allow read access by user', function() {
      var obj = db.AclPerson();
      obj.acl.allowReadAccess(db.User.me)
        .allowReadAccess(db2.User.me);

      var id;
      return obj.save().then(function(o) {
        id = obj.id;
        return db.AclPerson.load(id);
      }).then(function(obj) {
        return Promise.all([
          expect(db.AclPerson.load(id)).eventually.property('id', id),
          expect(db2.AclPerson.load(id)).eventually.property('id', id),
          expect(db3.AclPerson.load(id)).eventually.be.null
        ]);
      });
    });

    it('should deny read access by user', function() {
      var obj = db.AclPerson();
      obj.acl.denyReadAccess(db2.User.me);

      var id;
      return obj.save().then(function() {
        id = obj.id;
        return Promise.all([
          expect(db.AclPerson.load(id)).eventually.property('id', id),
          expect(db2.AclPerson.load(id)).eventually.be.null,
          expect(db3.AclPerson.load(id)).eventually.property('id', id)
        ]);
      });
    });

    it('should allow read access by group', function() {
      var obj = db.AclPerson();
      obj.acl.allowReadAccess(role13);

      var id;
      return obj.save().then(function() {
        id = obj.id;
        return Promise.all([
          expect(db.AclPerson.load(id)).eventually.property('id', id),
          expect(db2.AclPerson.load(id)).eventually.be.null,
          expect(db3.AclPerson.load(id)).eventually.property('id', id)
        ]);
      });
    });

    it('should deny read access by group', function() {
      var obj = db.AclPerson();
      obj.acl.denyReadAccess(role23);

      var id;
      return obj.save().then(function() {
        id = obj.id;
        return Promise.all([
          expect(db.AclPerson.load(id)).eventually.property('id', id),
          expect(db2.AclPerson.load(id)).eventually.be.null,
          expect(db3.AclPerson.load(id)).eventually.be.null
        ]);
      });
    });

  });

});