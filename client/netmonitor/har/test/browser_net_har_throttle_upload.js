/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

// Test timing of upload when throttling.

"use strict";

add_task(function* () {
  requestLongerTimeout(2);

  let [ , debuggee, monitor ] = yield initNetMonitor(
    HAR_EXAMPLE_URL + "html_har_post-data-test-page.html");

  info("Starting test... ");

  let { NetMonitorView } = monitor.panelWin;
  let { RequestsMenu } = NetMonitorView;

  const size = 4096;
  const request = {
    "NetworkMonitor.throttleData": {
      roundTripTimeMean: 0,
      roundTripTimeMax: 0,
      downloadBPSMean: 200000,
      downloadBPSMax: 200000,
      uploadBPSMean: size / 2,
      uploadBPSMax: size / 2,
    },
  };
  let client = monitor._controller.webConsoleClient;

  info("sending throttle request");
  let deferred = promise.defer();
  client.setPreferences(request, response => {
    deferred.resolve(response);
  });
  yield deferred.promise;

  RequestsMenu.lazyUpdate = false;

  // Execute one POST request on the page and wait till its done.
  debuggee.executeTest2(size);
  yield waitForNetworkEvents(monitor, 0, 1);

  // Copy HAR into the clipboard (asynchronous).
  let jsonString = yield RequestsMenu.copyAllAsHar();
  let har = JSON.parse(jsonString);

  // Check out the HAR log.
  isnot(har.log, null, "The HAR log must exist");
  is(har.log.pages.length, 1, "There must be one page");
  is(har.log.entries.length, 1, "There must be one request");

  let entry = har.log.entries[0];
  is(entry.request.postData.text, "x".repeat(size),
     "Check post data payload");

  ok(entry.timings.send >= 2000, "upload should have taken more than 2 seconds");

  // Clean up
  teardown(monitor).then(finish);
});