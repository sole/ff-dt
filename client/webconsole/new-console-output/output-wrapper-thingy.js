/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

// React & Redux
const React = require("devtools/client/shared/vendor/react");
const ReactDOM = require("devtools/client/shared/vendor/react-dom");
const { Provider } = require("devtools/client/shared/vendor/react-redux");

const {
  MESSAGE_ADD,
  MESSAGES_CLEAR
} = require("devtools/client/webconsole/new-console-output/constants");
const actions = require("devtools/client/webconsole/new-console-output/actions/messages");
const { store } = require("devtools/client/webconsole/new-console-output/store");

const ConsoleOutput = React.createFactory(require("devtools/client/webconsole/new-console-output/components/console-output"));

function OutputWrapperThingy(parentNode, jsterm) {
  let childComponent = ConsoleOutput({ jsterm });
  let provider = React.createElement(Provider, { store: store }, childComponent);
  this.body = ReactDOM.render(provider, parentNode);
}

OutputWrapperThingy.prototype = {
  dispatchMessageAdd: (message) => {
    store.dispatch(actions.messageAdd(message));
  },
  dispatchMessagesClear: () => {
    store.dispatch(actions.messagesClear());
  }
};

// Exports from this module
module.exports = OutputWrapperThingy;
