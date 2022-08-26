import browserstack from './browserstack';
import driver from './driver';
import moon from './moon';

export default [
  ...browserstack,
  ...driver,
  ...moon,
];
