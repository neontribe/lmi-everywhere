var connect = require('connect'),
  port = process.env.PORT || 3000;
connect(
  connect.logger(),
  connect.static(__dirname + (process.env.MODE === 'production' ? '/dist' : '/app'))
).listen(port);

console.log('Career trax server running on port ' + port);