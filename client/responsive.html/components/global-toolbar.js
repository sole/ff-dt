/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { DOM: dom, createClass, createFactory, PropTypes, addons } =
  require("devtools/client/shared/vendor/react");

const { getStr } = require("../utils/l10n");
const Types = require("../types");
const DPRSelector = createFactory(require("./dpr-selector"));
const NetworkThrottlingSelector = createFactory(require("./network-throttling-selector"));

module.exports = createClass({
  displayName: "GlobalToolbar",

  propTypes: {
    devices: PropTypes.shape(Types.devices).isRequired,
    displayPixelRatio: PropTypes.number.isRequired,
    networkThrottling: PropTypes.shape(Types.networkThrottling).isRequired,
    screenshot: PropTypes.shape(Types.screenshot).isRequired,
    selectedDevice: PropTypes.string.isRequired,
    selectedPixelRatio: PropTypes.number.isRequired,
    touchSimulation: PropTypes.shape(Types.touchSimulation).isRequired,
    onChangeNetworkThrottling: PropTypes.func.isRequired,
    onChangeViewportPixelRatio: PropTypes.func.isRequired,
    onExit: PropTypes.func.isRequired,
    onScreenshot: PropTypes.func.isRequired,
    onUpdateTouchSimulation: PropTypes.func.isRequired,
  },

  mixins: [ addons.PureRenderMixin ],

  render() {
    let {
      devices,
      displayPixelRatio,
      networkThrottling,
      screenshot,
      selectedDevice,
      selectedPixelRatio,
      touchSimulation,
      onChangeNetworkThrottling,
      onChangeViewportPixelRatio,
      onExit,
      onScreenshot,
      onUpdateTouchSimulation
    } = this.props;

    let touchButtonClass = "toolbar-button devtools-button";
    if (touchSimulation.enabled) {
      touchButtonClass += " active";
    }

    return dom.header(
      {
        id: "global-toolbar",
        className: "container",
      },
      dom.span(
        {
          className: "title",
        },
        getStr("responsive.title")
      ),
      NetworkThrottlingSelector({
        networkThrottling,
        onChangeNetworkThrottling,
      }),
      DPRSelector({
        devices,
        displayPixelRatio,
        selectedDevice,
        selectedPixelRatio,
        onChangeViewportPixelRatio,
      }),
      dom.button({
        id: "global-touch-simulation-button",
        className: touchButtonClass,
        title: (touchSimulation.enabled ?
          getStr("responsive.disableTouch") : getStr("responsive.enableTouch")),
        onClick: () => onUpdateTouchSimulation(!touchSimulation.enabled),
      }),
      dom.button({
        id: "global-screenshot-button",
        className: "toolbar-button devtools-button",
        title: getStr("responsive.screenshot"),
        onClick: onScreenshot,
        disabled: screenshot.isCapturing,
      }),
      dom.button({
        id: "global-exit-button",
        className: "toolbar-button devtools-button",
        title: getStr("responsive.exit"),
        onClick: onExit,
      })
    );
  },

});
