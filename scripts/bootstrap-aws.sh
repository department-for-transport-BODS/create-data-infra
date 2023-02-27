#!/bin/bash

set -e

ACCOUNT=$1
ACCOUNT_ID=$2

ACCOUNT=$ACCOUNT npm run cdk -- bootstrap aws://$ACCOUNT_ID/eu-west-2;
ACCOUNT=$ACCOUNT npm run cdk -- deploy --require-approval=never cd-infra-bootstrap-stack;
POLICY_ARN=$(aws cloudformation describe-stacks --stack-name cd-infra-bootstrap-stack --query "Stacks[0].Outputs" --output json | jq -rc '.[] | select(.OutputKey=="cdinfracdkexecutionpolicyarn") | .OutputValue');
ACCOUNT=$ACCOUNT npm run cdk -- bootstrap aws://$ACCOUNT_ID/eu-west-2 --cloudformation-execution-policies=$POLICY_ARN;