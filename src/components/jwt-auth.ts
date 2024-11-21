import {AppContext} from '@gravity-ui/nodekit';
import jwt from 'jsonwebtoken';
import {TransactionOrKnex, raw, transaction} from 'objection';
import {v4 as uuidv4} from 'uuid';

import {RefreshToken} from '../db/models/refresh-token';
import {Session} from '../db/models/session';
import {AccessTokenPayload, RefreshTokenPayload} from '../types';

const algorithm = 'RS256';

export type TokenPayload = {
    userId: string;
    sessionId: string;
};

export type FullTokenPayload = TokenPayload & {
    iat: number;
    exp: number;
};

type ServiceArgs = {trx?: TransactionOrKnex; ctx: AppContext};

export class JwtAuth {
    static generateTokens = async (
        {trx, ctx}: ServiceArgs,
        {userId, sessionId}: {userId: string; sessionId: string},
    ) => {
        ctx.log('GENERATE_TOKENS', {userId, sessionId});

        const accessToken = jwt.sign(
            {
                userId,
                sessionId,
            },
            ctx.config.accessTokenPrivateKey,
            {algorithm, expiresIn: `${ctx.config.accessTokenTTL}s`},
        );

        const refreshToken = jwt.sign(
            {
                userId,
                sessionId,
            },
            ctx.config.refreshTokenPrivateKey,
            {algorithm},
        );

        await RefreshToken.query(trx ?? RefreshToken.primary)
            .insert({
                refreshToken,
                sessionId,
                expiredAt: raw(`NOW() + INTERVAL '?? SECOND'`, [ctx.config.refreshTokenTTL]),
            })
            .timeout(RefreshToken.DEFAULT_QUERY_TIMEOUT);

        return {
            accessToken,
            refreshToken,
        };
    };

    static startSession = async (
        {trx, ctx}: ServiceArgs,
        {
            userId,
            userAgent,
            userIp,
        }: {
            userId: string;
            userAgent?: string;
            userIp: string | null;
        },
    ) => {
        ctx.log('START_SESSION', {userId, userAgent});

        return await transaction(trx ?? Session.primary, async (transactionTrx) => {
            const sessionId = uuidv4();

            await Session.query(transactionTrx)
                .insert({
                    sessionId,
                    userId,
                    userAgent: userAgent ?? 'Unknown',
                    userIp,
                    expiredAt: raw(`NOW() + INTERVAL '?? SECOND'`, [ctx.config.sessionTTL]),
                })
                .returning('*')
                .timeout(Session.DEFAULT_QUERY_TIMEOUT);

            const {accessToken, refreshToken} = await this.generateTokens(
                {trx: transactionTrx, ctx},
                {
                    userId,
                    sessionId,
                },
            );

            return {accessToken, refreshToken};
        });
    };

    static closeSession = async (
        {trx, ctx}: ServiceArgs,
        {
            refreshToken,
        }: {
            refreshToken: string;
        },
    ) => {
        ctx.log('CLOSE_SESSION');

        return await transaction(trx ?? RefreshToken.primary, async (transactionTrx) => {
            const refreshTokenModel = await RefreshToken.query(transactionTrx)
                .select()
                .where({
                    refreshToken,
                })
                .first()
                .timeout(RefreshToken.DEFAULT_QUERY_TIMEOUT);

            if (refreshTokenModel) {
                ctx.log('SESSION_INFO', {
                    sessionId: refreshTokenModel.sessionId,
                });

                await Session.query(transactionTrx)
                    .delete()
                    .where({
                        sessionId: refreshTokenModel.sessionId,
                    })
                    .timeout(RefreshToken.DEFAULT_QUERY_TIMEOUT);
            } else {
                ctx.log('REFRESH_TOKEN_NOT_EXISTS');
            }
        });
    };

    static refreshTokens = async (
        {trx, ctx}: ServiceArgs,
        {
            refreshToken,
            userIp,
        }: {
            refreshToken: string;
            userIp: string | null;
        },
    ) => {
        ctx.log('REFRESH_TOKENS');

        try {
            const {userId, sessionId} = this.verifyRefreshToken({ctx, refreshToken});

            const refreshTokenModel = await RefreshToken.query(RefreshToken.primary)
                .select()
                .where({
                    refreshToken,
                })
                .first()
                .timeout(RefreshToken.DEFAULT_QUERY_TIMEOUT);

            const session = await Session.query(Session.primary)
                .select()
                .where({sessionId, userId})
                .first()
                .timeout(Session.DEFAULT_QUERY_TIMEOUT);

            if (!refreshTokenModel) {
                if (session && session.userIp && session.userIp !== userIp) {
                    // Delete compromised session
                    await Session.query(Session.primary)
                        .delete()
                        .where({
                            sessionId,
                        })
                        .timeout(Session.DEFAULT_QUERY_TIMEOUT);
                }

                throw new Error('Unknown refreshToken');
            }

            if (new Date(refreshTokenModel.expiredAt).getTime() < new Date().getTime()) {
                throw new Error('Expired refreshToken');
            }

            if (!session) {
                throw new Error('Unknown session');
            }

            if (new Date(session.expiredAt).getTime() < new Date().getTime()) {
                throw new Error('Expired session');
            }

            return await transaction(trx ?? RefreshToken.primary, async (transactionTrx) => {
                await RefreshToken.query(transactionTrx)
                    .delete()
                    .where({refreshToken})
                    .timeout(RefreshToken.DEFAULT_QUERY_TIMEOUT);

                const result = await this.generateTokens(
                    {trx: transactionTrx, ctx},
                    {userId, sessionId},
                );

                await Session.query(transactionTrx)
                    .patch({
                        userIp,
                    })
                    .where({sessionId, userId})
                    .timeout(Session.DEFAULT_QUERY_TIMEOUT);

                return result;
            });
        } catch (err) {
            ctx.logError('REFRESH_TOKENS_ERROR', err);
            throw err;
        }
    };

    static verifyAccessToken = ({ctx, accessToken}: {ctx: AppContext; accessToken: string}) => {
        ctx.log('VERIFY_ACCESS_TOKEN');

        try {
            const result = jwt.verify(
                accessToken,
                ctx.config.accessTokenPublicKey,
            ) as AccessTokenPayload;
            ctx.log('VERIFY_ACCESS_TOKEN_SUCCESS');
            return result;
        } catch (err) {
            ctx.logError('VERIFY_ACCESS_TOKEN_ERROR', err);
            throw err;
        }
    };

    static verifyRefreshToken = ({ctx, refreshToken}: {ctx: AppContext; refreshToken: string}) => {
        ctx.log('VERIFY_REFRESH_TOKEN');

        try {
            const result = jwt.verify(
                refreshToken,
                ctx.config.refreshTokenPublicKey,
            ) as RefreshTokenPayload;
            ctx.log('VERIFY_REFRESH_TOKEN_SUCCESS');
            return result;
        } catch (err) {
            ctx.logError('VERIFY_REFRESH_TOKEN_ERROR', err);
            throw err;
        }
    };

    // static getAccessTokenPayload = (token: string) => {
    //     return jwt.decode(token) as AccessTokenPayload;
    // };

    // static getRefreshTokenPayload = (token: string) => {
    //     return jwt.decode(token) as RefreshTokenPayload;
    // };
}
