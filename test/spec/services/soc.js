'use strict';

describe('Service: soc', function () {

  // load the service's module
  beforeEach(module('lmiApp'));

  // instantiate service
  var soc;
  beforeEach(inject(function (_soc_) {
    soc = _soc_;
  }));

  it('should do something', function () {
    expect(!!soc).toBe(true);
  });

});
