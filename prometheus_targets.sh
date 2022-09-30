#!/bin/bash

HOSTS=$(cat ./.prometheus.targets)

HOSTS=$(printf "$HOSTS" | sed -r '/^\s*$/d')
HOSTS=$(printf "$HOSTS" | sed -r '/^#.*$/d')
HOSTS=$(printf "$HOSTS" | sed 's|$|,|' | tr -d '\n')
HOSTS=$(printf "$HOSTS" | sed 's|,$||')

sed -i -r "s|PROMETHEUS_TARGETS=.*$|PROMETHEUS_TARGETS='${HOSTS}'|g" ./.env
