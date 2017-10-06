import test from 'ava';
import 'babel-core/register';

import * as Client from '../client';

test('Client CollectionAPI', t => {
  t.truthy(Client, 'Client is truthy.');

  t.is(Object.keys(Client).length, 1, 'Client only contains one key');

  const { CollectionAPI } = Client;
  t.is(typeof CollectionAPI, 'string', 'Client side CollectionAPI is string');

  t.is(CollectionAPI, 'xcv58:collection-api has no client support!');
});
