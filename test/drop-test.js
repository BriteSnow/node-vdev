var vdev = require('../index');
var chai = require('chai');
var assert = chai.assert;


describe('version', function() {

	it('drop-test get and save version', function() {
		var javaFilePath = "./test/test-resources/java/AppModule.java";

		var v;

		vdev.drop.saveVarStringValue(javaFilePath, "VERSION", 'DROP-01');
		v = vdev.drop.getVarStringValue(javaFilePath, "VERSION");
		assert.equal(v, 'DROP-01');

		vdev.drop.saveVarStringValue(javaFilePath, "VERSION", 'DROP-Beta1.1-03');
		v = vdev.drop.getVarStringValue(javaFilePath, "VERSION");
		assert.equal(v, 'DROP-Beta1.1-03');
	});

	it('drop-test incVersion', function() {
		assert.equal('DROP-002', vdev.drop.incDropVersion('DROP-001'));
		assert.equal('DROP-beta-1.1-012', vdev.drop.incDropVersion('DROP-beta-1.1-011'));
		assert.equal('DROP-asfd-100', vdev.drop.incDropVersion('DROP-asfd-99'));
	});
	
});

