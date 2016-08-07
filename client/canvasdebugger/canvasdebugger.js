/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

var { classes: Cc, interfaces: Ci, utils: Cu, results: Cr } = Components;

const { require } = Cu.import("resource://devtools/shared/Loader.jsm", {});
const { XPCOMUtils } = require("resource://gre/modules/XPCOMUtils.jsm");
const { SideMenuWidget } = require("resource://devtools/client/shared/widgets/SideMenuWidget.jsm");
const promise = require("promise");
const Services = require("Services");
const EventEmitter = require("devtools/shared/event-emitter");
const { CallWatcherFront } = require("devtools/shared/fronts/call-watcher");
const { CanvasFront } = require("devtools/shared/fronts/canvas");
const DevToolsUtils = require("devtools/shared/DevToolsUtils");
const flags = require("devtools/shared/flags");
const { LocalizationHelper } = require("devtools/client/shared/l10n");
const { Heritage, WidgetMethods, setNamedTimeout, clearNamedTimeout,
        setConditionalTimeout } = require("devtools/client/shared/widgets/view-helpers");

const CANVAS_ACTOR_RECORDING_ATTEMPT = flags.testing ? 500 : 5000;

const { Task } = require("devtools/shared/task");

XPCOMUtils.defineLazyModuleGetter(this, "PluralForm",
  "resource://gre/modules/PluralForm.jsm");

XPCOMUtils.defineLazyModuleGetter(this, "FileUtils",
  "resource://gre/modules/FileUtils.jsm");

XPCOMUtils.defineLazyModuleGetter(this, "NetUtil",
  "resource://gre/modules/NetUtil.jsm");

XPCOMUtils.defineLazyGetter(this, "NetworkHelper", function () {
  return require("devtools/shared/webconsole/network-helper");
});

// The panel's window global is an EventEmitter firing the following events:
const EVENTS = {
  // When the UI is reset from tab navigation.
  UI_RESET: "CanvasDebugger:UIReset",

  // When all the animation frame snapshots are removed by the user.
  SNAPSHOTS_LIST_CLEARED: "CanvasDebugger:SnapshotsListCleared",

  // When an animation frame snapshot starts/finishes being recorded, and
  // whether it was completed succesfully or cancelled.
  SNAPSHOT_RECORDING_STARTED: "CanvasDebugger:SnapshotRecordingStarted",
  SNAPSHOT_RECORDING_FINISHED: "CanvasDebugger:SnapshotRecordingFinished",
  SNAPSHOT_RECORDING_COMPLETED: "CanvasDebugger:SnapshotRecordingCompleted",
  SNAPSHOT_RECORDING_CANCELLED: "CanvasDebugger:SnapshotRecordingCancelled",

  // When an animation frame snapshot was selected and all its data displayed.
  SNAPSHOT_RECORDING_SELECTED: "CanvasDebugger:SnapshotRecordingSelected",

  // After all the function calls associated with an animation frame snapshot
  // are displayed in the UI.
  CALL_LIST_POPULATED: "CanvasDebugger:CallListPopulated",

  // After the stack associated with a call in an animation frame snapshot
  // is displayed in the UI.
  CALL_STACK_DISPLAYED: "CanvasDebugger:CallStackDisplayed",

  // After a screenshot associated with a call in an animation frame snapshot
  // is displayed in the UI.
  CALL_SCREENSHOT_DISPLAYED: "CanvasDebugger:ScreenshotDisplayed",

  // After all the thumbnails associated with an animation frame snapshot
  // are displayed in the UI.
  THUMBNAILS_DISPLAYED: "CanvasDebugger:ThumbnailsDisplayed",

  // When a source is shown in the JavaScript Debugger at a specific location.
  SOURCE_SHOWN_IN_JS_DEBUGGER: "CanvasDebugger:SourceShownInJsDebugger",
  SOURCE_NOT_FOUND_IN_JS_DEBUGGER: "CanvasDebugger:SourceNotFoundInJsDebugger"
};
XPCOMUtils.defineConstant(this, "EVENTS", EVENTS);

const HTML_NS = "http://www.w3.org/1999/xhtml";
const STRINGS_URI = "chrome://devtools/locale/canvasdebugger.properties";
const SHARED_STRINGS_URI = "chrome://devtools/locale/shared.properties";

const SNAPSHOT_START_RECORDING_DELAY = 10; // ms
const SNAPSHOT_DATA_EXPORT_MAX_BLOCK = 1000; // ms
const SNAPSHOT_DATA_DISPLAY_DELAY = 10; // ms
const SCREENSHOT_DISPLAY_DELAY = 100; // ms
const STACK_FUNC_INDENTATION = 14; // px

// This identifier string is simply used to tentatively ascertain whether or not
// a JSON loaded from disk is actually something generated by this tool or not.
// It isn't, of course, a definitive verification, but a Good Enough™
// approximation before continuing the import. Don't localize this.
const CALLS_LIST_SERIALIZER_IDENTIFIER = "Recorded Animation Frame Snapshot";
const CALLS_LIST_SERIALIZER_VERSION = 1;
const CALLS_LIST_SLOW_SAVE_DELAY = 100; // ms

/**
 * The current target and the Canvas front, set by this tool's host.
 */
var gToolbox, gTarget, gFront;

/**
 * Initializes the canvas debugger controller and views.
 */
function startupCanvasDebugger() {
  return promise.all([
    EventsHandler.initialize(),
    SnapshotsListView.initialize(),
    CallsListView.initialize()
  ]);
}

/**
 * Destroys the canvas debugger controller and views.
 */
function shutdownCanvasDebugger() {
  return promise.all([
    EventsHandler.destroy(),
    SnapshotsListView.destroy(),
    CallsListView.destroy()
  ]);
}

/**
 * Functions handling target-related lifetime events.
 */
var EventsHandler = {
  /**
   * Listen for events emitted by the current tab target.
   */
  initialize: function () {
    // Make sure the backend is prepared to handle <canvas> contexts.
    // Since actors are created lazily on the first request to them, we need to send an
    // early request to ensure the CallWatcherActor is running and watching for new window
    // globals.
    gFront.setup({ reload: false });

    this._onTabNavigated = this._onTabNavigated.bind(this);
    gTarget.on("will-navigate", this._onTabNavigated);
    gTarget.on("navigate", this._onTabNavigated);
  },

  /**
   * Remove events emitted by the current tab target.
   */
  destroy: function () {
    gTarget.off("will-navigate", this._onTabNavigated);
    gTarget.off("navigate", this._onTabNavigated);
  },

  /**
   * Called for each location change in the debugged tab.
   */
  _onTabNavigated: function (event) {
    if (event != "will-navigate") {
      return;
    }

    // Reset UI.
    SnapshotsListView.empty();
    CallsListView.empty();

    $("#record-snapshot").removeAttribute("checked");
    $("#record-snapshot").removeAttribute("disabled");
    $("#record-snapshot").hidden = false;

    $("#reload-notice").hidden = true;
    $("#empty-notice").hidden = false;
    $("#waiting-notice").hidden = true;

    $("#debugging-pane-contents").hidden = true;
    $("#screenshot-container").hidden = true;
    $("#snapshot-filmstrip").hidden = true;

    window.emit(EVENTS.UI_RESET);
  }
};

/**
 * Localization convenience methods.
 */
var L10N = new LocalizationHelper(STRINGS_URI);
var SHARED_L10N = new LocalizationHelper(SHARED_STRINGS_URI);

/**
 * Convenient way of emitting events from the panel window.
 */
EventEmitter.decorate(this);

/**
 * DOM query helpers.
 */
var $ = (selector, target = document) => target.querySelector(selector);
var $all = (selector, target = document) => target.querySelectorAll(selector);

/**
 * Gets the fileName part of a string which happens to be an URL.
 */
function getFileName(url) {
  try {
    let { fileName } = NetworkHelper.nsIURL(url);
    return fileName || "/";
  } catch (e) {
    // This doesn't look like a url, or nsIURL can't handle it.
    return "";
  }
}

/**
 * Gets an image data object containing a buffer large enough to hold
 * width * height pixels.
 *
 * This method avoids allocating memory and tries to reuse a common buffer
 * as much as possible.
 *
 * @param number w
 *        The desired image data storage width.
 * @param number h
 *        The desired image data storage height.
 * @return ImageData
 *         The requested image data buffer.
 */
function getImageDataStorage(ctx, w, h) {
  let storage = getImageDataStorage.cache;
  if (storage && storage.width == w && storage.height == h) {
    return storage;
  }
  return getImageDataStorage.cache = ctx.createImageData(w, h);
}

// The cache used in the `getImageDataStorage` function.
getImageDataStorage.cache = null;

/**
 * Draws image data into a canvas.
 *
 * This method makes absolutely no assumptions about the canvas element
 * dimensions, or pre-existing rendering. It's a dumb proxy that copies pixels.
 *
 * @param HTMLCanvasElement canvas
 *        The canvas element to put the image data into.
 * @param number width
 *        The image data width.
 * @param number height
 *        The image data height.
 * @param array pixels
 *        An array buffer view of the image data.
 * @param object options
 *        Additional options supported by this operation:
 *          - centered: specifies whether the image data should be centered
 *                      when copied in the canvas; this is useful when the
 *                      supplied pixels don't completely cover the canvas.
 */
function drawImage(canvas, width, height, pixels, options = {}) {
  let ctx = canvas.getContext("2d");

  // FrameSnapshot actors return "snapshot-image" type instances with just an
  // empty pixel array if the source image is completely transparent.
  if (pixels.length <= 1) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  let imageData = getImageDataStorage(ctx, width, height);
  imageData.data.set(pixels);

  if (options.centered) {
    let left = (canvas.width - width) / 2;
    let top = (canvas.height - height) / 2;
    ctx.putImageData(imageData, left, top);
  } else {
    ctx.putImageData(imageData, 0, 0);
  }
}

/**
 * Draws image data into a canvas, and sets that as the rendering source for
 * an element with the specified id as the -moz-element background image.
 *
 * @param string id
 *        The id of the -moz-element background image.
 * @param number width
 *        The image data width.
 * @param number height
 *        The image data height.
 * @param array pixels
 *        An array buffer view of the image data.
 */
function drawBackground(id, width, height, pixels) {
  let canvas = document.createElementNS(HTML_NS, "canvas");
  canvas.width = width;
  canvas.height = height;

  drawImage(canvas, width, height, pixels);
  document.mozSetImageElement(id, canvas);

  // Used in tests. Not emitting an event because this shouldn't be "interesting".
  if (window._onMozSetImageElement) {
    window._onMozSetImageElement(pixels);
  }
}

/**
 * Iterates forward to find the next draw call in a snapshot.
 */
function getNextDrawCall(calls, call) {
  for (let i = calls.indexOf(call) + 1, len = calls.length; i < len; i++) {
    let nextCall = calls[i];
    let name = nextCall.attachment.actor.name;
    if (CanvasFront.DRAW_CALLS.has(name)) {
      return nextCall;
    }
  }
  return null;
}

/**
 * Iterates backwards to find the most recent screenshot for a function call
 * in a snapshot loaded from disk.
 */
function getScreenshotFromCallLoadedFromDisk(calls, call) {
  for (let i = calls.indexOf(call); i >= 0; i--) {
    let prevCall = calls[i];
    let screenshot = prevCall.screenshot;
    if (screenshot) {
      return screenshot;
    }
  }
  return CanvasFront.INVALID_SNAPSHOT_IMAGE;
}

/**
 * Iterates backwards to find the most recent thumbnail for a function call.
 */
function getThumbnailForCall(thumbnails, index) {
  for (let i = thumbnails.length - 1; i >= 0; i--) {
    let thumbnail = thumbnails[i];
    if (thumbnail.index <= index) {
      return thumbnail;
    }
  }
  return CanvasFront.INVALID_SNAPSHOT_IMAGE;
}
