import {Request, Response} from '@gravity-ui/expresskit';
import {transaction} from 'objection';
import requestIp from 'request-ip';
import {v4 as uuidv4} from 'uuid';

import {clearAuthCookies, getAuthCookies, setAuthCookie} from '../components/cookies';
import {JwtAuth} from '../components/jwt-auth';
import {generateSalt, hashPassword} from '../components/passwords';
import {LOCAL_IDENTITY_ID} from '../constants';
import {User} from '../db/models/user';
import {makeCombinedUserId} from '../utils';

export default {
    signup: async (req: Request, res: Response) => {
        const {login, displayName, password} = req.body;

        if (!login || !password) {
            res.status(400).send('login and password are required');
            return;
        }

        const user = await User.query(User.replica)
            .select()
            .where({
                login,
            })
            .first()
            .timeout(User.DEFAULT_QUERY_TIMEOUT);

        if (user) {
            res.status(409).send('User already exists');
            return;
        }

        const passwordSalt = generateSalt();
        const hashedPassword = hashPassword({
            password,
            salt: passwordSalt,
        });

        const userId = makeCombinedUserId({userId: uuidv4(), identityId: LOCAL_IDENTITY_ID});

        await transaction(User.primary, async (transactionTrx) => {
            await User.query(transactionTrx)
                .insert({
                    userId,
                    displayName,
                    login,
                    password: hashedPassword,
                    passwordSalt,
                })
                .timeout(User.DEFAULT_QUERY_TIMEOUT);

            const tokens = await JwtAuth.startSession(
                {ctx: req.ctx, trx: transactionTrx},
                {
                    userId,
                    userAgent: req.headers['user-agent'],
                    userIp: requestIp.getClientIp(req),
                },
            );

            setAuthCookie({req, res, tokens});
            res.status(302).redirect('/');
        });
    },

    logout: async (req: Request, res: Response) => {
        const {authCookie} = getAuthCookies(req);

        if (authCookie && authCookie.refreshToken) {
            await JwtAuth.closeSession({ctx: req.ctx}, {refreshToken: authCookie.refreshToken});
        }

        clearAuthCookies(res);
        res.status(302).redirect('/');
    },

    refresh: async (req: Request, res: Response) => {
        const {authCookie} = getAuthCookies(req);

        if (authCookie && authCookie.refreshToken) {
            try {
                const tokens = await JwtAuth.refreshTokens(
                    {ctx: req.ctx},
                    {
                        refreshToken: authCookie.refreshToken,
                        userIp: requestIp.getClientIp(req),
                    },
                );
                setAuthCookie({req, res, tokens});
                res.status(200).send();
            } catch (err) {
                res.status(401).send("Can't refresh tokens");
            }
        } else {
            res.status(401).send('No refreshToken');
        }
    },
};
