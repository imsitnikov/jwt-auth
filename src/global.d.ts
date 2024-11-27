import {Profile} from '@node-saml/node-saml';

import type {AuthorizedUser, CtxUser} from './types';

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Express {
        interface User extends AuthorizedUser {}

        interface Request {
            samlLogoutRequest: Profile;
        }
    }
}

declare module '@gravity-ui/nodekit' {
    interface AppContextParams {
        user: CtxUser;
    }

    interface AppConfig {
        uiAppEndpoint: string;

        accessTokenTTL: number;
        refreshTokenTTL: number;
        sessionTTL: number;

        tokenPrivateKey: string;
        tokenPublicKey: string;

        samlAuth: {
            id: string;
            entryPoint: string;
            cert: string;
            callbackPath: string;
            issuer: string;
        };

        ldapAuth: {
            id: string;
            url: string;
            bindDN: string;
            bindCredentials: string;
            searchBase: string;
            searchFilter: string;
        };
    }
}
