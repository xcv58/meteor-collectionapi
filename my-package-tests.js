// Import Tinytest from the tinytest Meteor package.
import { Tinytest } from "meteor/tinytest";

// Import and rename a variable exported by my-package.js.
import { name as packageName } from "meteor/my-package";

// Write your tests here!
// Here is an example.
Tinytest.add('my-package - example', function (test) {
  test.equal(packageName, "my-package");
});
