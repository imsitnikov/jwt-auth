import {AppContext} from '@gravity-ui/nodekit';
import jwt from 'jsonwebtoken';
import {TransactionOrKnex, raw, transaction} from 'objection';

import {getId} from '../db';
import {RefreshToken} from '../db/models/refresh-token';
import {Session} from '../db/models/session';
import {AccessTokenPayload, RefreshTokenPayload} from '../types';
import {decodeId, encodeId} from '../utils';

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

        const encodedSessionId = encodeId(sessionId);

        const accessToken = jwt.sign(
            {
                userId,
                sessionId: encodedSessionId,
            },
            ctx.config.tokenPrivateKey,
            {algorithm, expiresIn: `${ctx.config.accessTokenTTL}s`},
        );

        const refreshTokenId = await getId();
        const encodedRefreshTokenId = encodeId(refreshTokenId);

        const refreshToken = jwt.sign(
            {
                refreshTokenId: encodedRefreshTokenId,
                userId,
                sessionId: encodedSessionId,
            },
            ctx.config.tokenPrivateKey,
            {algorithm},
        );

        await RefreshToken.query(trx ?? RefreshToken.primary)
            .insert({
                refreshTokenId,
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
            const session = await Session.query(transactionTrx)
                .insert({
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
                    sessionId: session.sessionId,
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

        try {
            const token = this.verifyRefreshToken({
                ctx,
                refreshToken,
            });

            const decodedRefreshTokenId = decodeId(token.refreshTokenId);

            return await transaction(trx ?? RefreshToken.primary, async (transactionTrx) => {
                const refreshTokenModel = await RefreshToken.query(transactionTrx)
                    .select()
                    .where({
                        refreshTokenId: decodedRefreshTokenId,
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
        } catch (err) {
            ctx.logError('CLOSE_SESSION_ERROR', err);
            throw err;
        }
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
            const token = this.verifyRefreshToken({
                ctx,
                refreshToken,
            });

            const userId = token.userId;
            const decodedRefreshTokenId = decodeId(token.refreshTokenId);
            const decodedSessionId = decodeId(token.sessionId);

            const refreshTokenModel = await RefreshToken.query(RefreshToken.primary)
                .select()
                .where({
                    refreshTokenId: decodedRefreshTokenId,
                })
                .first()
                .timeout(RefreshToken.DEFAULT_QUERY_TIMEOUT);

            const session = await Session.query(Session.primary)
                .select()
                .where({sessionId: decodedSessionId, userId})
                .first()
                .timeout(Session.DEFAULT_QUERY_TIMEOUT);

            if (!refreshTokenModel) {
                if (session && session.userIp && session.userIp !== userIp) {
                    // Delete compromised session
                    await Session.query(Session.primary)
                        .delete()
                        .where({
                            sessionId: decodedSessionId,
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
                    .where({refreshTokenId: decodedRefreshTokenId})
                    .timeout(RefreshToken.DEFAULT_QUERY_TIMEOUT);

                const result = await this.generateTokens(
                    {trx: transactionTrx, ctx},
                    {userId, sessionId: decodedSessionId},
                );

                await Session.query(transactionTrx)
                    .patch({
                        userIp,
                    })
                    .where({sessionId: decodedSessionId, userId})
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
            const result = jwt.verify(accessToken, ctx.config.tokenPublicKey) as AccessTokenPayload;
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
                ctx.config.tokenPublicKey,
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
