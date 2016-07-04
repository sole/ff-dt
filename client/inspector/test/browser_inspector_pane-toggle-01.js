/* vim: set ft=javascript ts=2 et sw=2 tw=80: */
/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */
"use strict";

// Test that the inspector panel has a sidebar pane toggle button, and that
// this button is visible both in BOTTOM and SIDE hosts.

add_task(function* () {
  info("Open the inspector in a bottom toolbox host");
  let {toolbox, inspector} = yield openInspectorForURL("about:blank", "bottom");

  let button = inspector.panelDoc.querySelector(".sidebar-toggle");
  ok(button, "The toggle button exists in the DOM");
  is(button.parentNode.id, "inspector-sidebar-toggle-box",
     "The toggle button has the right parent");
  ok(button.getAttribute("title"), "The tool tip has initial state");
  ok(!button.classList.contains("pane-collapsed"), "The button is in expanded state");
  ok(!!button.getClientRects().length, "The button is visible");

  info("Switch the host to side type");
  yield toolbox.switchHost("side");

  ok(!!button.getClientRects().length, "The button is still visible");
  ok(!button.classList.contains("pane-collapsed"),
     "The button is still in expanded state");
});
