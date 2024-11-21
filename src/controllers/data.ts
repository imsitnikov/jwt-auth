import {Request, Response} from '@gravity-ui/expresskit';

import {RefreshToken} from '../db/models/refresh-token';
import {Session} from '../db/models/session';
import {User} from '../db/models/user';

export default {
    getUser: async (req: Request, res: Response) => {
        const {userId} = req.ctx.get('user');
        const user = await User.query(User.replica)
            .select()
            .where({userId})
            .first()
            .timeout(User.DEFAULT_QUERY_TIMEOUT);

        res.status(200).send(user);
    },

    getUsers: async (req: Request, res: Response) => {
        const users = await User.query(User.replica)
            .select()
            .orderBy('createdAt', 'desc')
            .timeout(User.DEFAULT_QUERY_TIMEOUT);
        res.status(200).send(users);
    },

    deleteUser: async (req: Request, res: Response) => {
        const userId = req.params.userId as string;

        if (!userId) {
            res.status(400).send('No userId');
            return;
        }

        await User.query(User.primary)
            .delete()
            .where({
                userId,
            })
            .timeout(User.DEFAULT_QUERY_TIMEOUT);

        res.status(200).send('User is deleted');
    },

    getSessions: async (req: Request, res: Response) => {
        const sessions = await Session.query(Session.replica)
            .select()
            .orderBy('createdAt', 'desc')
            .timeout(Session.DEFAULT_QUERY_TIMEOUT);

        res.status(200).send(sessions);
    },

    getUserSessions: async (req: Request, res: Response) => {
        const {userId} = req.ctx.get('user');

        const sessions = await Session.query(Session.replica)
            .select()
            .where({
                userId,
            })
            .orderBy('createdAt', 'desc')
            .timeout(Session.DEFAULT_QUERY_TIMEOUT);

        res.status(200).send(sessions);
    },

    deleteSession: async (req: Request, res: Response) => {
        const sessionId = req.params.sessionId as string;

        if (!sessionId) {
            res.status(400).send('No sessionId');
            return;
        }

        await Session.query(Session.primary)
            .delete()
            .where({
                sessionId,
            })
            .timeout(Session.DEFAULT_QUERY_TIMEOUT);

        res.status(200).send('Session is deleted');
    },

    getRefreshTokens: async (req: Request, res: Response) => {
        const refreshTokens = await RefreshToken.query(RefreshToken.replica)
            .select()
            .orderBy('createdAt', 'desc')
            .timeout(Session.DEFAULT_QUERY_TIMEOUT);

        res.status(200).send(refreshTokens);
    },

    deleteRefreshToken: async (req: Request, res: Response) => {
        const refreshToken = req.params.refreshToken as string;

        if (!refreshToken) {
            res.status(400).send('No refreshToken');
            return;
        }

        await RefreshToken.query(RefreshToken.primary)
            .delete()
            .where({
                refreshToken,
            })
            .timeout(RefreshToken.DEFAULT_QUERY_TIMEOUT);

        res.status(200).send('refreshToken is deleted');
    },
};
