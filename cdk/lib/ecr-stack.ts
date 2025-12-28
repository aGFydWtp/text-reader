import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';

export class EcrStack extends cdk.Stack {
  public readonly frontendRepository: ecr.Repository;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.frontendRepository = new ecr.Repository(this, 'FrontendRepository', {
      imageScanOnPush: true,
      repositoryName: "text-reader-frontend",
      imageTagMutability: ecr.TagMutability.IMMUTABLE_WITH_EXCLUSION,
      imageTagMutabilityExclusionFilters: [ecr.ImageTagMutabilityExclusionFilter.wildcard("latest")]
    });

    new cdk.CfnOutput(this, 'FrontendRepositoryName', {
      value: this.frontendRepository.repositoryName,
    });
    new cdk.CfnOutput(this, 'FrontendRepositoryUri', {
      value: this.frontendRepository.repositoryUri,
    });
  }
}
