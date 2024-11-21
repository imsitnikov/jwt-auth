import {Model} from '../';

export class Session extends Model {
    static get tableName() {
        return 'sessions';
    }

    static get idColumn() {
        return 'sessionId';
    }

    sessionId!: string;
    userId!: string;
    userAgent!: string;
    userIp!: string | null;
    createdAt!: string;
    updatedAt!: string;
    expiredAt!: string;
}
