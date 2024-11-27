import {macrotasksEncodeData} from '../utils';

export async function prepareResponseAsync({data}: {data: any}) {
    const response = await macrotasksEncodeData(data);

    if (response.refreshTokens) {
        response.refreshTokens = await macrotasksEncodeData(response.refreshTokens);
    }
    if (response.sessions) {
        response.sessions = await macrotasksEncodeData(response.sessions);
    }
    if (response.users) {
        response.users = await macrotasksEncodeData(response.sessions);
    }

    return {
        code: 200,
        response,
    };
}
