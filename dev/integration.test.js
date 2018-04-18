var fs = require('fs');

fs.readFile( __dirname + '/../courses/experimental/lynx/core.lynx', function (err, data) {
  if (err) {
    throw err;
  }
    describe('Integration', () => {
      it('test integration test', () => {
        expect(true).toBe(true);
      });
    });
  console.log(data.toString());
})


