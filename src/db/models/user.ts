import {Model} from '../';

export class User extends Model {
    static get tableName() {
        return 'users';
    }

    static get idColumn() {
        return 'userId';
    }

    userId!: string;
    displayName!: string;
    createdAt!: string;
    updatedAt!: string;
    login!: string | null;
    password!: string | null;
    passwordSalt!: string | null;
}
