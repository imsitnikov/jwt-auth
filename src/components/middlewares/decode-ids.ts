import {NextFunction, Request, Response} from '@gravity-ui/expresskit';
import {AppError} from '@gravity-ui/nodekit';

import {ID_VARIABLES} from '../../constants';
import {decodeId, macrotasksMap} from '../../utils';

export const decodeIdsMiddleware = async (req: Request, _res: Response, next: NextFunction) => {
    try {
        for (const idVariable of ID_VARIABLES) {
            if (req.params && req.params[idVariable]) {
                const encodedId = req.params[idVariable];
                req.params[idVariable] = decodeId(encodedId);
            }

            if (req.query && req.query[idVariable]) {
                const entity = req.query[idVariable] as string | string[];

                if (Array.isArray(entity)) {
                    req.query[idVariable] = await macrotasksMap(entity, (encodedId) =>
                        decodeId(encodedId),
                    );
                } else {
                    const encodedId = entity;
                    req.query[idVariable] = decodeId(encodedId);
                }
            }

            if (req.body && req.body[idVariable]) {
                const entity = req.body[idVariable] as string | string[];

                if (Array.isArray(entity)) {
                    req.body[idVariable] = await macrotasksMap(entity, (encodedId) =>
                        decodeId(encodedId),
                    );
                } else {
                    const encodedId = req.body[idVariable];
                    req.body[idVariable] = decodeId(encodedId);
                }
            }
        }
    } catch {
        const errorMsg =
            'Some of the Ids do not have a correct format — an id should be in the lower case and consist of 13 symbols';

        throw new AppError(errorMsg, {
            code: 'DECODE_ID_FAILED',
        });
    }

    return next();
};
