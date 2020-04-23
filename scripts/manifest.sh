#!/usr/bin/env bash

# Exit script as soon as a command fails.
set -o errexit

# Factory known addresses
factory_rinkeby=0xad4d106b43b480faa3ef7f98464ffc27fc1faa96
factory_mainnet=0x7378ad1ba8f3c8e64bbb2a04473edd35846360f1

# Known block numbers
start_block_rinkeby=6367208
start_block_mainnet=9930462

# Validate network
networks=(rpc ropsten staging rinkeby mainnet)
if [[ -z $NETWORK || ! " ${networks[@]} " =~ " ${NETWORK} " ]]; then
  echo 'Please make sure the network provided is either rpc, ropsten, staging, rinkeby, or mainnet.'
  exit 1
fi

# Use mainnet network in case of local deployment
if [[ "$NETWORK" = "rpc" ]]; then
  ENV='mainnet'
elif [[ "$NETWORK" = "staging" ]]; then
  ENV='rinkeby'
else
  ENV=${NETWORK}
fi

# Load start block
if [[ -z $START_BLOCK ]]; then
  START_BLOCK_VAR=start_block_$NETWORK
  START_BLOCK=${!START_BLOCK_VAR}
fi
if [[ -z $START_BLOCK ]]; then
  START_BLOCK=0
fi

# Try loading factory address if missing
if [[ -z $FACTORY ]]; then
  FACTORY_VAR=factory_$NETWORK
  FACTORY=${!FACTORY_VAR}
fi

# Validate factory address
if [[ -z $FACTORY ]]; then
  echo 'Please make sure a DAO Factory address is provided'
  exit 1
fi

# Remove previous subgraph if there is any
if [ -f subgraph.yaml ]; then
  echo 'Removing previous subgraph manifest...'
  rm subgraph.yaml
fi

# Build subgraph manifest for requested variables
echo "Preparing new subgraph for DAO factory address ${FACTORY} to network ${NETWORK}"
cp subgraph.template.yaml subgraph.yaml
sed -i -e "s/{{network}}/${ENV}/g" subgraph.yaml
sed -i -e "s/{{factory}}/${FACTORY}/g" subgraph.yaml
sed -i -e "s/{{startBlock}}/${START_BLOCK}/g" subgraph.yaml
rm -f subgraph.yaml-e
