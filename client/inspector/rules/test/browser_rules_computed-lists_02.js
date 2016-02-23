/* vim: set ft=javascript ts=2 et sw=2 tw=80: */
/* Any copyright is dedicated to the Public Domain.
 http://creativecommons.org/publicdomain/zero/1.0/ */

"use strict";

// Tests that the rule view computed lists can be expanded/collapsed,
// and contain the right subproperties.

var TEST_URI = `
  <style type="text/css">
    #testid {
      margin: 0px 1px 2px 3px;
      top: 0px;
    }
  </style>
  <h1 id="testid">Styled Node</h1>
`;

add_task(function*() {
  yield addTab("data:text/html;charset=utf-8," + encodeURIComponent(TEST_URI));
  let {inspector, view} = yield openRuleView();
  yield selectNode("#testid", inspector);
  yield testComputedList(inspector, view);
});

function* testComputedList(inspector, view) {
  let rule = getRuleViewRuleEditor(view, 1).rule;
  let propEditor = rule.textProps[0].editor;
  let expander = propEditor.expander;

  ok(!expander.hasAttribute("open"), "margin computed list is closed");

  info("Opening the computed list of margin property");
  expander.click();
  ok(expander.hasAttribute("open"), "margin computed list is open");

  let computed = propEditor.prop.computed;
  let computedDom = propEditor.computed;
  let propNames = [
    "margin-top",
    "margin-right",
    "margin-bottom",
    "margin-left"
  ];

  is(computed.length, propNames.length, "There should be 4 computed values");
  is(computedDom.children.length, propNames.length,
     "There should be 4 nodes in the DOM");

  propNames.forEach((propName, i) => {
    let propValue = i + "px";
    is(computed[i].name, propName,
       "Computed property #" + i + " has name " + propName);
    is(computed[i].value, propValue,
       "Computed property #" + i + " has value " + propValue);
    is(computedDom.querySelectorAll(".ruleview-propertyname")[i].textContent,
       propName,
       "Computed property #" + i + " in DOM has correct name");
    is(computedDom.querySelectorAll(".ruleview-propertyvalue")[i].textContent,
       propValue,
       "Computed property #" + i + " in DOM has correct value");
  });

  info("Closing the computed list of margin property");
  expander.click();
  ok(!expander.hasAttribute("open"), "margin computed list is closed");

  info("Opening the computed list of margin property");
  expander.click();
  ok(expander.hasAttribute("open"), "margin computed list is open");
  is(computed.length, propNames.length, "Still 4 computed values");
  is(computedDom.children.length, propNames.length, "Still 4 nodes in the DOM");
}
