import {AuthPolicy} from '@gravity-ui/expresskit';
import {AppConfig} from '@gravity-ui/nodekit';

const getEnvCert = (envCert: string) => envCert.replace(/\\n/g, '\n');

const config: Partial<AppConfig> = {
    appName: 'jwt-auth',
    appAuthPolicy: AuthPolicy.required,

    uiAppEndpoint: process.env.UI_APP_ENDPOINT as string,

    // accessTokenTTL: 60 * 15, // 15 min
    // refreshTokenTTL: 60 * 60 * 24 * 10, // 10 days
    // sessionTTL: 60 * 60 * 24 * 30, // 30 days

    accessTokenTTL: 10, // 10 sec
    // accessTokenTTL: 60, // 60 sec
    refreshTokenTTL: 60 * 60, // 1 hour
    sessionTTL: 60 * 60 * 24 * 30, // 30 days

    tokenPrivateKey: getEnvCert(process.env.TOKEN_PRIVATE_KEY as string),
    tokenPublicKey: getEnvCert(process.env.TOKEN_PUBLIC_KEY as string),

    samlAuth: {
        id: process.env.SAML_AUTH_ID as string,
        entryPoint: process.env.SAML_AUTH_ENTRY_POINT as string,
        cert: getEnvCert(process.env.SAML_AUTH_CERT as string),
        callbackPath: process.env.SAML_CALLBACK_PATH as string,
        issuer: process.env.SAML_ISSUER as string,
    },

    ldapAuth: {
        id: process.env.LDAP_AUTH_ID as string,
        url: process.env.LDAP_AUTH_URL as string,
        bindDN: process.env.LDAP_AUTH_BIND_DN as string,
        bindCredentials: process.env.LDAP_AUTH_BIND_CREDENTIALS as string,
        searchBase: process.env.LDAP_AUTH_SEARCH_BASE as string,
        searchFilter: process.env.LDAP_AUTH_SEARCH_FILTER as string,
    },
};

export default config;
