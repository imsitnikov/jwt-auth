export type AuthorizedUser = {
    userId: string;
    accessToken: string;
    refreshToken: string;
};

export type CtxUser = {
    userId: string;
    sessionId: string;
};

export type ExpirableTokenPayload = {
    iat: number;
    exp: number;
};

export type AccessTokenPayload = ExpirableTokenPayload & {
    userId: string;
    sessionId: string;
};

export type RefreshTokenPayload = {
    refreshTokenId: string;
    userId: string;
    sessionId: string;
};
