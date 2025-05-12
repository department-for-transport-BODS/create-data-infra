#!/bin/bash

set -e

ACCOUNT=$1
ACCOUNT_ID=$2
STAGE=$3
INCLUDE_USEAST1=$4

if [[ $INCLUDE_USEAST1 ]]; then
    ACCOUNT=$ACCOUNT STAGE=$STAGE pnpm cdk bootstrap aws://$ACCOUNT_ID/eu-west-2;
    ACCOUNT=$ACCOUNT STAGE=$STAGE pnpm cdk bootstrap aws://$ACCOUNT_ID/us-east-1;
    ACCOUNT=$ACCOUNT STAGE=$STAGE INCLUDE_USEAST1=true pnpm cdk deploy --require-approval=never cd-infra-bootstrap-stack cd-infra-bootstrap-stack-us-east-1;
    POLICY_ARN=$(aws cloudformation describe-stacks --region=eu-west-2 --stack-name cd-infra-bootstrap-stack --query "Stacks[0].Outputs" --output json | jq -rc '.[] | select(.OutputKey=="cdinfracdkexecutionpolicyarn") | .OutputValue');
    UE1_POLICY_ARN=$(aws cloudformation describe-stacks --region=us-east-1 --stack-name cd-infra-bootstrap-stack-us-east-1 --query "Stacks[0].Outputs" --output json | jq -rc '.[] | select(.OutputKey=="cdinfracdkexecutionpolicyarn") | .OutputValue');
    ACCOUNT=$ACCOUNT STAGE=$STAGE pnpm cdk bootstrap aws://$ACCOUNT_ID/eu-west-2 --cloudformation-execution-policies=$POLICY_ARN;
    ACCOUNT=$ACCOUNT STAGE=$STAGE pnpm cdk bootstrap aws://$ACCOUNT_ID/us-east-1 --cloudformation-execution-policies=$UE1_POLICY_ARN;

    ACCOUNT=$ACCOUNT STAGE=$STAGE INCLUDE_USEAST1=true pnpm cdk deploy --require-approval=never --all;
else
    ACCOUNT=$ACCOUNT STAGE=$STAGE pnpm cdk bootstrap aws://$ACCOUNT_ID/eu-west-2;
    ACCOUNT=$ACCOUNT STAGE=$STAGE pnpm cdk deploy --require-approval=never cd-infra-bootstrap-stack --region=eu-west-2;
    POLICY_ARN=$(aws cloudformation describe-stacks --region=eu-west-2 --stack-name cd-infra-bootstrap-stack --query "Stacks[0].Outputs" --output json | jq -rc '.[] | select(.OutputKey=="cdinfracdkexecutionpolicyarn") | .OutputValue');
    ACCOUNT=$ACCOUNT STAGE=$STAGE pnpm cdk bootstrap aws://$ACCOUNT_ID/eu-west-2 --cloudformation-execution-policies=$POLICY_ARN;

    ACCOUNT=$ACCOUNT STAGE=$STAGE pnpm cdk deploy --require-approval=never --all;
fi