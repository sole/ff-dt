#!/bin/bash
if [ -z $VIRTUAL_ENV ]; then
  echo "In order to run test, you need to setup python environment."
  echo "Please run the following command from devtools root folder:"
  echo " $ source config.sh"
  exit
fi

$(dirname $0)/mochitest/run-tests.sh $@
