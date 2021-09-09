# Skyital Webhooks

HTTP server that listens to webhook requests handled with custom logics. 

The main reason for me to create this was that the reverse orders in zignaly open the close and open at the same moment. This causes an error if your order size > 50% because the close position is not yet filled at the moment the open order is received. So this node.js script does the following: 

- If a json with type = exit is received it relays it to zignaly as a webhook
- If a json with type = reverse is received it relays it to zignaly, but split in two: 
  - an exit order that is sent right away
  - wait 2min and send an open order

In addition, if the incoming webhook is not json and starts with 'trade:' than that is meant for the frostybot-js that I have running and the command is relayed verbatim. 

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


## Future usages
This script is currently tailored to my specific needs (market orders only / zignaly / frostybot), but if there is interest I can expand it, or host it for others who are experiencing similar issues. 

One thought I have is to send one webhook from TradingView for each bot that you have, then (dependign on yoru settings), this can be converted and sent out to: 3commas, Zignaly, StackedInvest, Frosty-js, and any other conceivible service. Or even directly converted to an exchange order. If you are interested, send me a message! 


