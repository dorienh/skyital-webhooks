# Skyital Webhooks

HTTP server that listens to webhook requests handled with custom logics

## Requirements

Node.js >= 10

## Dependencies

- `axios` - an http client for sending outgoing requests
- `express` - a web server for listening to incoming requests
- `http-errors` - a package for easily creating http error objects
- `nodemon` - a code monitoring tool for automatic relod during development
- `winston` - a logger that can write either to console or to disk
- `path` - a native module for composing absolute file paths

## Installation

``
$ npm i
$ npm run dev (on local)
or
$ npm run start (on production)
``

## Deployment
I suggest a very effective and straightforward way to deploy and run. Say, you are on Linux and your machine is also on Linux with git installed, then:
$ ssh ... // ssh into your machine
$ cd / // go to the root
$ git clone ... // clone your repository
$ cd ... // go to the cloned repo
$ npm i
$ apt-get install tmux // it's a terminal multiplexer allowing you to to run detached terminals; use sudo if lacking privileges; see https://github.com/tmux/tmux/wiki for more info
$ tmux // open a tmux terminal
$ npm run start // start the server
$ Ctrl+b d // detach from the terminal; press in sequense
$ tmux ls // list available terminals to attach to
$ tmux attach -t 0 // attach to a terminal with the 0 tag
