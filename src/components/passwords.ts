import bcrypt from 'bcrypt';

export const generateSalt = () => {
    return new Promise<string>((resolve, reject) => {
        bcrypt.genSalt(12, (err, salt) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(salt);
        });
    });
};

export const hashPassword = ({password, salt}: {password: string; salt: string}) => {
    return new Promise<string>((resolve, reject) => {
        bcrypt.hash(password, salt, (err, hash) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(hash);
        });
    });
};

export const comparePasswords = async ({
    inputPassword,
    storedPasswordHash,
}: {
    inputPassword: string;
    storedPasswordHash: string;
}) => {
    return new Promise<boolean>((resolve, reject) => {
        bcrypt.compare(inputPassword, storedPasswordHash, (err, result) => {
            if (err) {
                reject(err);
                return;
            }

            if (result) {
                resolve(true);
            } else {
                reject(true);
            }
        });
    });
};
