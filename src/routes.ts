import {AppMiddleware, AppRoutes, AuthPolicy} from '@gravity-ui/expresskit';

import auth from './controllers/auth';
import data from './controllers/data';

export const getRoutes = ({afterAuth}: {afterAuth: AppMiddleware[]}) => {
    const routes: AppRoutes = {
        'POST /signup': {
            handler: auth.signup,
            authPolicy: AuthPolicy.disabled,
        },

        'GET /logout': {
            handler: auth.logout,
            authPolicy: AuthPolicy.disabled,
        },

        'POST /refresh': {
            handler: auth.refresh,
            authPolicy: AuthPolicy.disabled,
        },

        'GET /user': {
            handler: data.getUser,
            afterAuth,
        },

        'GET /users': {
            handler: data.getUsers,
            afterAuth,
        },

        'DELETE /users/:userId': {
            handler: data.deleteUser,
        },

        'GET /sessions': {
            handler: data.getSessions,
            afterAuth,
        },

        'GET /user-sessions': {
            handler: data.getUserSessions,
            afterAuth,
        },

        'DELETE /sessions/:sessionId': {
            handler: data.deleteSession,
            afterAuth,
        },

        'GET /refresh-tokens': {
            handler: data.getRefreshTokens,
            afterAuth,
        },

        'DELETE /refresh-tokens/:refreshTokenId': {
            handler: data.deleteRefreshToken,
            afterAuth,
        },
    };

    return routes;
};
