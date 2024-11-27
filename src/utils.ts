import chunk from 'lodash/chunk';

import {ID_VARIABLES} from './constants';

const PowerRadix = require('power-radix');

export const makeCombinedUserId = ({userId, identityId}: {userId: string; identityId: string}) => {
    return `${identityId}:${userId}`;
};
const ID_CODING_BASE = '0123456789abcdefghijklmnopqrstuvwxyz'.split('');

const rotate = (array: any[], n: number) => {
    let rotatedArray = [];

    if (Array.isArray(array)) {
        rotatedArray = array.slice(n, array.length).concat(array.slice(0, n));
    }

    return rotatedArray;
};

export const encodeId = (bigIntId: any) => {
    let encodedId = '';

    if (bigIntId) {
        const bigIntIdShortPart: any = bigIntId.slice(-2);

        const rotationNumber = bigIntIdShortPart % ID_CODING_BASE.length;
        const rotatedCodingBase = rotate(ID_CODING_BASE, rotationNumber);

        const encodedLongPart = new PowerRadix(bigIntId, 10).toString(rotatedCodingBase);
        const encodedRotationNumber = new PowerRadix(rotationNumber, 10).toString(ID_CODING_BASE);

        encodedId = encodedLongPart + encodedRotationNumber;
    }

    return encodedId;
};

export const decodeId = (id: string) => {
    let decodedId = '';

    if (id) {
        const encodedRotationNumber = id.slice(-1);
        const encodedLongPart = id.slice(0, -1);

        const decodedRotationNumber = new PowerRadix(
            encodedRotationNumber,
            ID_CODING_BASE,
        ).toString(10);
        const rotatedCodingBase = rotate(ID_CODING_BASE, decodedRotationNumber);

        const decodedLongPart = new PowerRadix(encodedLongPart, rotatedCodingBase).toString(10);

        decodedId = decodedLongPart;
    }

    return decodedId;
};

export const encodeIds = (object: {[key: string]: any}) => {
    for (const idVariable of ID_VARIABLES) {
        if (object && object[idVariable]) {
            const id = object[idVariable];
            object[idVariable] = id && encodeId(id);
        }
    }

    return object;
};

export const macrotasksMap = async <T, R extends (item: T) => unknown>(
    arr: T[],
    cb: R,
    chunkSize = 1000,
): Promise<ReturnType<R>[]> => {
    const chunks = chunk(arr, chunkSize);
    const results: ReturnType<R>[] = [];
    for (const chunkItem of chunks) {
        const items = (await new Promise((resolve, reject) => {
            function done() {
                try {
                    resolve(chunkItem.map(cb));
                } catch (error) {
                    reject(error);
                }
            }
            if (chunkItem === chunks[0]) {
                done();
            } else {
                setImmediate(done);
            }
        })) as unknown as ReturnType<R>[];
        results.push(...items);
    }
    return results;
};

export const macrotasksEncodeData = async (data: any) => {
    let dataFormed;

    if (Array.isArray(data)) {
        dataFormed = await macrotasksMap(data, encodeIds);
    } else if (data !== null && typeof data === 'object') {
        dataFormed = encodeIds(data);
    } else {
        dataFormed = data;
    }

    return dataFormed;
};
