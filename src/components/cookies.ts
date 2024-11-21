import {Request, Response} from '@gravity-ui/expresskit';
import jwt from 'jsonwebtoken';

import {AUTH_COOKIE_NAME, AUTH_EXP_COOKIE_NAME} from '../constants';
import {AccessTokenPayload} from '../types';

type Tokens = {accessToken: string; refreshToken: string};

export const setAuthCookie = ({
    // req,
    res,
    tokens,
}: {
    req: Request;
    res: Response;
    tokens: Tokens;
}) => {
    const {accessToken, refreshToken} = tokens;

    res.cookie(
        AUTH_COOKIE_NAME,
        JSON.stringify({
            accessToken,
            refreshToken,
        }),
        {
            // secure: true,
            httpOnly: true,
            path: '/',
            // domain: req.ctx.config.uiAppEndpoint,
        },
    );

    const {exp} = jwt.decode(accessToken) as AccessTokenPayload;

    res.cookie(AUTH_EXP_COOKIE_NAME, exp, {
        // secure: true,
        httpOnly: false,
        path: '/',
        // domain: req.ctx.config.uiAppEndpoint,
    });
};

export const getAuthCookies = (req: Request) => {
    const authCookie = req.cookies[AUTH_COOKIE_NAME] as string | undefined;
    const authExpCookie = req.cookies[AUTH_EXP_COOKIE_NAME] as string | undefined;

    let parsedAuthCookie: Tokens | undefined;
    if (authCookie) {
        try {
            parsedAuthCookie = JSON.parse(authCookie) as Tokens;
        } catch (err) {}
    }

    let parsedAuthExpCookie: number | undefined;
    if (authExpCookie) {
        parsedAuthExpCookie = Number(authExpCookie);
    }

    return {
        authCookie: parsedAuthCookie,
        authExpCookie: parsedAuthExpCookie,
    };
};

export const clearAuthCookies = (res: Response) => {
    res.clearCookie(AUTH_COOKIE_NAME).clearCookie(AUTH_EXP_COOKIE_NAME);
};

export const afterSuccessAuth = (req: Request, res: Response) => {
    if (!req.user) {
        res.status(500).send('No user');
        return;
    }

    setAuthCookie({
        req,
        res,
        tokens: {
            accessToken: req.user.accessToken,
            refreshToken: req.user.refreshToken,
        },
    });

    res.status(302).redirect('/');
};
