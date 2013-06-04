var connect = require('connect'),
  port = process.env.PORT || 3000;
connect(
  connect.logger(),
  connect.static(__dirname + '/app')
).listen(port);

console.log('lmi-everywhere server running on port ' + port);