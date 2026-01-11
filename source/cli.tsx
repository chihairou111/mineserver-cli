#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import meow from 'meow';
import App from './app.js';

meow(
	`
	Usage
	  $ mineserver

	Options

	Examples
	  $ mineserver
`,
	{
		importMeta: import.meta,
		flags: {},
	},
);

render(<App />);
