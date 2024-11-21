import {Request} from '@gravity-ui/expresskit';
import {AppConfig} from '@gravity-ui/nodekit';
import passport from 'passport';
import {default as LdapStrategy} from 'passport-ldapauth';
import {Strategy as LocalStrategy} from 'passport-local';
import {Strategy as SamlStrategy} from 'passport-saml';
import requestIp from 'request-ip';

import {JwtAuth} from '../components/jwt-auth';
import {LOCAL_IDENTITY_ID} from '../constants';
import {User} from '../db/models/user';
import type {AuthorizedUser} from '../types';
import {makeCombinedUserId} from '../utils';

import {comparePasswords} from './passwords';

export const initPassport = (config: AppConfig) => {
    passport.serializeUser((user, cb) => {
        process.nextTick(() => {
            cb(null, {
                userId: user.userId,
                accessToken: user.accessToken,
                refreshToken: user.refreshToken,
            });
        });
    });

    passport.deserializeUser((user: AuthorizedUser, cb) => {
        process.nextTick(() => {
            cb(null, user);
        });
    });

    const {samlAuth, ldapAuth} = config;
    const usernameField = 'login';

    passport.use(
        new LocalStrategy(
            {usernameField, passReqToCallback: true},
            async (req, username, password, done) => {
                try {
                    const user = await User.query(User.replica)
                        .select()
                        .where({
                            login: username,
                        })
                        .andWhereLike('userId', `${LOCAL_IDENTITY_ID}:%`)
                        .first()
                        .timeout(User.DEFAULT_QUERY_TIMEOUT);

                    if (!user) {
                        throw new Error('No local user');
                    }

                    if (!user.password || !user.passwordSalt) {
                        throw new Error('No password for local user');
                    }

                    const authResult = comparePasswords({
                        inputPassword: password,
                        storedPassword: user.password,
                        salt: user.passwordSalt,
                    });

                    if (authResult) {
                        const {accessToken, refreshToken} = await JwtAuth.startSession(
                            {ctx: req.ctx},
                            {
                                userId: user.userId,
                                userAgent: req.headers['user-agent'],
                                userIp: requestIp.getClientIp(req),
                            },
                        );
                        done(null, {
                            userId: user.userId,
                            accessToken,
                            refreshToken,
                        });
                        return;
                    } else {
                        throw new Error('Incorrect password');
                    }
                } catch (err) {
                    req.ctx.logError('AUTH_ERROR', err);
                    done(null, false);
                    return;
                }
            },
        ),
    );

    passport.use(
        new SamlStrategy(
            {
                passReqToCallback: true,
                path: samlAuth.callbackPath,
                entryPoint: samlAuth.entryPoint,
                issuer: samlAuth.issuer,
                cert: samlAuth.cert,
            },
            async (req, profile, done) => {
                if (profile) {
                    const userId = makeCombinedUserId({
                        userId: profile.userId as string,
                        identityId: samlAuth.id,
                    });

                    await User.query(User.primary)
                        .insert({
                            userId,
                            displayName: [profile.lastName, profile.firstName].join(' '),
                        })
                        .onConflict(['userId'])
                        .merge()
                        .timeout(User.DEFAULT_QUERY_TIMEOUT);

                    const {accessToken, refreshToken} = await JwtAuth.startSession(
                        {ctx: req.ctx},
                        {
                            userId,
                            userAgent: req.headers['user-agent'],
                            userIp: requestIp.getClientIp(req),
                        },
                    );

                    done(null, {
                        userId,
                        accessToken,
                        refreshToken,
                    });
                } else {
                    const error = new Error('No profile');
                    req.ctx.logError('AUTH_ERROR', error);
                    done(error);
                    return;
                }
            },
        ),
    );

    passport.use(
        new LdapStrategy(
            {
                usernameField,
                passReqToCallback: true,
                server: {
                    url: ldapAuth.url,
                    bindDN: ldapAuth.bindDN,
                    bindCredentials: ldapAuth.bindCredentials,
                    searchBase: ldapAuth.searchBase,
                    searchFilter: ldapAuth.searchFilter,
                    tlsOptions: {
                        rejectUnauthorized: false,
                        requestCert: true,
                    },
                },
            },
            async (_req, user, done) => {
                const req = _req as unknown as Request;

                if (user) {
                    const userId = makeCombinedUserId({userId: user.uid, identityId: ldapAuth.id});

                    await User.query(User.primary)
                        .insert({
                            userId,
                            displayName: user.givenName,
                        })
                        .onConflict(['userId'])
                        .merge()
                        .timeout(User.DEFAULT_QUERY_TIMEOUT);

                    const {accessToken, refreshToken} = await JwtAuth.startSession(
                        {ctx: req.ctx},
                        {
                            userId,
                            userAgent: req.headers['user-agent'],
                            userIp: requestIp.getClientIp(req),
                        },
                    );

                    done(null, {
                        userId,
                        accessToken,
                        refreshToken,
                    });
                } else {
                    const error = new Error('No user');
                    req.ctx.logError('AUTH_ERROR', error);
                    done(error);
                    return;
                }
            },
        ),
    );
};
