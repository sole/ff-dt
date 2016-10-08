/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* vim: set ft=javascript ts=2 et sw=2 tw=80: */
/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Check console.group, console.groupCollapsed and console.groupEnd calls
// behave as expected.

const TEST_URI = "http://example.com/browser/devtools/client/webconsole/new-console-output/test/mochitest/test-console-group.html";
const { INDENT_WIDTH } = require("devtools/client/webconsole/new-console-output/components/message-indent");

add_task(function* () {
  let toolbox = yield openNewTabAndToolbox(TEST_URI, "webconsole");
  let hud = toolbox.getCurrentPanel().hud;

  info("Test a group at root level");
  let node = yield waitFor(() => findMessage(hud, "group-1"));
  testClass(node, "startGroup");
  testIndent(node, 0);

  info("Test a message in a 1 level deep group");
  node = yield waitFor(() => findMessage(hud, "log-1"));
  testClass(node, "log");
  testIndent(node, 1);

  info("Test a group in a 1 level deep group");
  node = yield waitFor(() => findMessage(hud, "group-2"));
  testClass(node, "startGroup");
  testIndent(node, 1);

  info("Test a message in a 2 level deep group");
  node = yield waitFor(() => findMessage(hud, "log-2"));
  testClass(node, "log");
  testIndent(node, 2);

  info("Test a message in a 1 level deep group, after closing a 2 level deep group");
  node = yield waitFor(() => findMessage(hud, "log-3"));
  testClass(node, "log");
  testIndent(node, 1);

  info("Test a message at root level, after closing all the groups");
  node = yield waitFor(() => findMessage(hud, "log-4"));
  testClass(node, "log");
  testIndent(node, 0);

  info("Test a collapsed group at root level");
  node = yield waitFor(() => findMessage(hud, "group-3"));
  testClass(node, "startGroupCollapsed");
  testIndent(node, 0);

  info("Test a message at root level, after closing a collapsed group");
  node = yield waitFor(() => findMessage(hud, "log-6"));
  testClass(node, "log");
  testIndent(node, 0);

  let nodes = hud.ui.experimentalOutputNode.querySelectorAll(".message");
  is(nodes.length, 8, "expected number of messages are displayed");
});

function testClass(node, className) {
  ok(node.classList.contains(className, "message has the expected class"));
}

function testIndent(node, indent) {
  indent = `${indent * INDENT_WIDTH}px`;
  is(node.querySelector(".indent").style.width, indent,
    "message has the expected level of indentation");
}
