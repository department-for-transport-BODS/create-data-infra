#!/bin/bash

set -e

ACCOUNT=$1
ACCOUNT_ID=$2
INCLUDE_USEAST1=$3

if [[ $INCLUDE_USEAST1 ]]; then
    ACCOUNT=$ACCOUNT npm run cdk -- bootstrap aws://$ACCOUNT_ID/eu-west-2;
    ACCOUNT=$ACCOUNT npm run cdk -- bootstrap aws://$ACCOUNT_ID/us-east-1;
    ACCOUNT=$ACCOUNT INCLUDE_USEAST1=true npm run cdk -- deploy --require-approval=never cd-infra-bootstrap-stack cd-infra-bootstrap-stack-us-east-1;
    POLICY_ARN=$(aws cloudformation describe-stacks --region=eu-west-2 --stack-name cd-infra-bootstrap-stack --query "Stacks[0].Outputs" --output json | jq -rc '.[] | select(.OutputKey=="cdinfracdkexecutionpolicyarn") | .OutputValue');
    UE1_POLICY_ARN=$(aws cloudformation describe-stacks --region=us-east-1 --stack-name cd-infra-bootstrap-stack-us-east-1 --query "Stacks[0].Outputs" --output json | jq -rc '.[] | select(.OutputKey=="cdinfracdkexecutionpolicyarn") | .OutputValue');
    ACCOUNT=$ACCOUNT npm run cdk -- bootstrap aws://$ACCOUNT_ID/eu-west-2 --cloudformation-execution-policies=$POLICY_ARN;
    ACCOUNT=$ACCOUNT npm run cdk -- bootstrap aws://$ACCOUNT_ID/us-east-1 --cloudformation-execution-policies=$UE1_POLICY_ARN;
else
    ACCOUNT=$ACCOUNT npm run cdk -- bootstrap aws://$ACCOUNT_ID/eu-west-2;
    ACCOUNT=$ACCOUNT npm run cdk -- deploy --require-approval=never cd-infra-bootstrap-stack --region=eu-west-2;
    POLICY_ARN=$(aws cloudformation describe-stacks --region=eu-west-2 --stack-name cd-infra-bootstrap-stack --query "Stacks[0].Outputs" --output json | jq -rc '.[] | select(.OutputKey=="cdinfracdkexecutionpolicyarn") | .OutputValue');
    ACCOUNT=$ACCOUNT npm run cdk -- bootstrap aws://$ACCOUNT_ID/eu-west-2 --cloudformation-execution-policies=$POLICY_ARN;
fi