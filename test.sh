#!/usr/bin/env bash

# PIPELINE="fetch,patch,build" PACKAGE_NAME="keytar" PACKAGE_VERSION="7.9.0" yarn run pipeline
# PIPELINE="fetch,patch,build" PACKAGE_NAME="@thiagoelg/node-printer" PACKAGE_VERSION="0.6.2" yarn run pipeline
# cd package && node lib/

PIPELINE="fetch,patch,build" PACKAGE_NAME="gl" PACKAGE_VERSION="6.0.2" yarn run pipeline
