#!/bin/bash

PLATFORM=linux64-opt

set -e
set -x

SCRIPT_DIR=$(dirname $0)

rm -rf $SCRIPT_DIR/artifacts/firefox
mkdir -p $SCRIPT_DIR/artifacts/

TASK_ID=$(cat $SCRIPT_DIR/task_id)
echo "TaskID: $TASK_ID"

######## 

FILENAME=target.tar.bz2
URL=https://queue.taskcluster.net/v1/task/$TASK_ID/artifacts/public/build/$FILENAME
PACKAGE=$(readlink -f $SCRIPT_DIR/$FILENAME)

curl -vL -o $PACKAGE $URL

tar jxf $PACKAGE -C $SCRIPT_DIR/artifacts/
#rm $PACKAGE
