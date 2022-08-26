// Enable aliases for files that aren't handled by any bundler or compiler in WebStorm
/* eslint-disable no-undef */
System.config({
  paths: {
    '~/*': './*',
  }
});
