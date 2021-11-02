import {ConfigPlugin} from '@expo/config-plugins';
export declare const addAuth0GradleValues: (
  src: string,
  auth0Domain?: string | undefined,
  auth0Scheme?: string | undefined,
) => string;
export declare const addAuth0AppDelegateCode: (src: string) => string;
declare const _default: ConfigPlugin<void>;
export default _default;
