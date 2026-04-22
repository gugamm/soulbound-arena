// Test bootstrap: registers the ESM resolver hook and installs the Phaser stub
// so that client modules (which extend Phaser and use "/shared/..." imports)
// can be loaded directly in Node for testing.

import { register } from 'node:module';

register('./helpers/resolver.mjs', import.meta.url);
await import('./helpers/phaser-stub.js');
