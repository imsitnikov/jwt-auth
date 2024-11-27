import {AppMiddleware, ExpressKit, NextFunction, Request, Response} from '@gravity-ui/expresskit';
import {AppError} from '@gravity-ui/nodekit';
import dotenv from 'dotenv';
import passport from 'passport';

dotenv.config();

import {afterSuccessAuth} from './components/cookies';
import {JwtAuth} from './components/jwt-auth';
import {decodeIdsMiddleware} from './components/middlewares/decode-ids';
import {initPassport} from './components/passport';
import {nodekit} from './nodekit';
import {getRoutes} from './routes';

nodekit.config.appFinalErrorHandler = async (error: AppError, req: Request, res: Response) => {
    req.ctx.logError('Error', error);
    res.status(500).send(error);
};

const afterAuth: AppMiddleware[] = [decodeIdsMiddleware];

nodekit.config.appAuthHandler = async (req: Request, res: Response, next: NextFunction) => {
    req.ctx.log('AUTH');

    const {authorization} = req.headers;

    if (authorization) {
        const accessToken = authorization.substring(7, authorization.length);

        if (accessToken) {
            try {
                req.ctx.log('CHECK_ACCESS_TOKEN');

                const {userId, sessionId} = JwtAuth.verifyAccessToken({ctx: req.ctx, accessToken});

                req.originalContext.set('user', {
                    userId,
                    sessionId,
                });

                req.ctx.log('CHECK_ACCESS_TOKEN_SUCCESS');

                next();
                return;
            } catch (err) {
                req.ctx.logError('CHECK_ACCESS_TOKEN_ERROR', err);
            }
        }
    }

    res.status(401).send('Unauthorized access');
};

const app = new ExpressKit(nodekit, getRoutes({afterAuth}), {
    beforeRoutes: (express) => {
        express.post(
            '/signin',
            passport.authenticate('local', {
                failureRedirect: '/signin',
                session: false,
            }),
            afterSuccessAuth,
        );

        express.get('/signin/saml', passport.authenticate('saml'));
        express.post(
            '/signin/saml/callback',
            passport.authenticate('saml', {failureRedirect: '/signin', session: false}),
            afterSuccessAuth,
        );

        express.post(
            '/signin/ldap',
            passport.authenticate('ldapauth', {failureRedirect: '/signin/ldap', session: false}),
            afterSuccessAuth,
        );
    },
});

initPassport(app.config);

if (require.main === module) {
    app.run();
}

export default app;
