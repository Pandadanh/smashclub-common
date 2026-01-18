import { SetMetadata } from '@nestjs/common';

export const VALIDATE_INPUT_KEY = 'validateInput';

export interface ValidateInputOptions {
  /** Skip validation for this route */
  skip?: boolean;
  /** Custom validation groups */
  groups?: string[];
}

/**
 * Decorator to configure input validation behavior
 */
export const ValidateInput = (options: ValidateInputOptions = {}) =>
  SetMetadata(VALIDATE_INPUT_KEY, options);

