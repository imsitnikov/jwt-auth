import {Model} from '../';

export class RefreshToken extends Model {
    static get tableName() {
        return 'refreshTokens';
    }

    static get idColumn() {
        return 'refreshTokenId';
    }

    refreshTokenId!: string;
    sessionId!: string;
    createdAt!: string;
    expiredAt!: string;
}
