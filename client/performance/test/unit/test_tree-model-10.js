/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

/**
 * Tests that the tree model calculates correct costs/percentages for
 * frame nodes. The model-only version of browser_profiler-tree-view-10.js
 */

function run_test() {
  run_next_test();
}

add_task(function () {
  let { ThreadNode } = require("devtools/client/performance/modules/logic/tree-model");
  let thread = new ThreadNode(gThread, { invertTree: true, startTime: 0, endTime: 50 });

  /**
   * Samples
   *
   * A->C
   * A->B
   * A->B->C x4
   * A->B->D x4
   *
   * Expected Tree
   * +--total--+--self--+--tree-------------+
   * |   50%   |   50%  |  C
   * |   40%   |   0    |  -> B
   * |   30%   |   0    |     -> A
   * |   10%   |   0    |  -> A
   *
   * |   40%   |   40%  |  D
   * |   40%   |   0    |  -> B
   * |   40%   |   0    |     -> A
   *
   * |   10%   |   10%  |  B
   * |   10%   |   0    |  -> A
   */

  [ // total, self, name
    [ 50, 50, "C", [
      [ 40, 0, "B", [
        [ 30, 0, "A"]
      ]],
      [ 10, 0, "A"]
    ]],
    [ 40, 40, "D", [
      [ 40, 0, "B", [
        [ 40, 0, "A"],
      ]]
    ]],
    [ 10, 10, "B", [
      [ 10, 0, "A"],
    ]]
  ].forEach(compareFrameInfo(thread));
});

function compareFrameInfo(root, parent) {
  parent = parent || root;
  return function (def) {
    let [total, self, name, children] = def;
    let node = getFrameNodePath(parent, name);
    let data = node.getInfo({ root });
    equal(total, data.totalPercentage, `${name} has correct total percentage: ${data.totalPercentage}`);
    equal(self, data.selfPercentage, `${name} has correct self percentage: ${data.selfPercentage}`);
    if (children) {
      children.forEach(compareFrameInfo(root, node));
    }
  };
}

var gThread = synthesizeProfileForTest([{
  time: 5,
  frames: [
    { location: "(root)" },
    { location: "A" },
    { location: "B" },
    { location: "C" }
  ]
}, {
  time: 10,
  frames: [
    { location: "(root)" },
    { location: "A" },
    { location: "B" },
    { location: "D" }
  ]
}, {
  time: 15,
  frames: [
    { location: "(root)" },
    { location: "A" },
    { location: "C" },
  ]
}, {
  time: 20,
  frames: [
    { location: "(root)" },
    { location: "A" },
    { location: "B" },
  ]
}, {
  time: 25,
  frames: [
    { location: "(root)" },
    { location: "A" },
    { location: "B" },
    { location: "C" }
  ]
}, {
  time: 30,
  frames: [
    { location: "(root)" },
    { location: "A" },
    { location: "B" },
    { location: "C" }
  ]
}, {
  time: 35,
  frames: [
    { location: "(root)" },
    { location: "A" },
    { location: "B" },
    { location: "D" }
  ]
}, {
  time: 40,
  frames: [
    { location: "(root)" },
    { location: "A" },
    { location: "B" },
    { location: "D" }
  ]
}, {
  time: 45,
  frames: [
    { location: "(root)" },
    { location: "B" },
    { location: "C" }
  ]
}, {
  time: 50,
  frames: [
    { location: "(root)" },
    { location: "A" },
    { location: "B" },
    { location: "D" }
  ]
}]);
