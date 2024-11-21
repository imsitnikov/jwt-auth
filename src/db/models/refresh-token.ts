import {Model} from '../';

export class RefreshToken extends Model {
    static get tableName() {
        return 'refreshTokens';
    }

    static get idColumn() {
        return 'refreshToken';
    }

    refreshToken!: string;
    sessionId!: string;
    createdAt!: string;
    expiredAt!: string;
}
