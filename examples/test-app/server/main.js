import { Meteor } from 'meteor/meteor';
import { CollectionAPI } from 'meteor/xcv58:collection-api';

Meteor.startup(() => {
  // code to run on server at startup
  const API = new CollectionAPI();
  console.log(API);
});
