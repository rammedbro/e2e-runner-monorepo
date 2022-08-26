#!/usr/bin/env node
const path = require('path');

const pkg = require('./package.json');
const { Cli } = require(path.join(__dirname, pkg.main));

const cli = new Cli();
cli
  .run()
  .catch(e => {
    console.log(e.message);
    process.exit(1);
  });
