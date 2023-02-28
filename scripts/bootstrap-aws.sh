#!/bin/bash

set -e

ACCOUNT=$1
ACCOUNT_ID=$2
REGION=$3

ACCOUNT=$ACCOUNT npm run cdk -- bootstrap aws://$ACCOUNT_ID/$REGION;
ACCOUNT=$ACCOUNT npm run cdk -- deploy --require-approval=never cd-infra-bootstrap-stack --region=$REGION;
POLICY_ARN=$(aws cloudformation describe-stacks --region=$REGION --stack-name cd-infra-bootstrap-stack --query "Stacks[0].Outputs" --output json | jq -rc '.[] | select(.OutputKey=="cdinfracdkexecutionpolicyarn") | .OutputValue');
ACCOUNT=$ACCOUNT npm run cdk -- bootstrap aws://$ACCOUNT_ID/$REGION --cloudformation-execution-policies=$POLICY_ARN;