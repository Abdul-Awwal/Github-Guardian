export enum IaCType {
  TERRAFORM = 'Terraform',
  DOCKERFILE = 'Dockerfile',
  K8S_YAML = 'K8s YAML',
  OTHER = 'Other',
}

export const IAC_TYPES = Object.values(IaCType);
