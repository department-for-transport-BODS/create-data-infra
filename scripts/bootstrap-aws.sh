#!/bin/bash

set -e

ACCOUNT_TYPE=$1
ACCOUNT_ID=$2

ACCOUNT_TYPE=$ACCOUNT_TYPE npm run cdk -- bootstrap aws://$ACCOUNT_ID/eu-west-2;
ACCOUNT_TYPE=$ACCOUNT_TYPE npm run cdk -- deploy cd-infra-bootstrap-stack aws://$ACCOUNT_ID/eu-west-2;
POLICY_ARN=$(aws cloudformation describe-stacks --stack-name cd-infra-bootstrap-stack --query "Stacks[0].Outputs" --output json | jq -rc '.[] | select(.OutputKey=="cdinfracdkexecutionpolicyarn") | .OutputValue');
ACCOUNT_TYPE=$ACCOUNT_TYPE npm run cdk -- bootstrap aws://$ACCOUNT_ID/eu-west-2 --cloudformation-execution-policies=$POLICY_ARN;