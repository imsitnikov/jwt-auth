import {AppRoutes, AuthPolicy} from '@gravity-ui/expresskit';

import auth from './controllers/auth';
import data from './controllers/data';

export const routes: AppRoutes = {
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
    },

    'GET /users': {
        handler: data.getUsers,
    },

    'DELETE /users/:userId': {
        handler: data.deleteUser,
    },

    'GET /sessions': {
        handler: data.getSessions,
    },

    'GET /user-sessions': {
        handler: data.getUserSessions,
    },

    'DELETE /sessions/:sessionId': {
        handler: data.deleteSession,
    },

    'GET /refresh-tokens': {
        handler: data.getRefreshTokens,
    },

    'DELETE /refresh-tokens/:refreshToken': {
        handler: data.deleteRefreshToken,
    },
};
