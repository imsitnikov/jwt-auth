import crypto from 'crypto';

export const generateSalt = (rounds = 12) => {
    return crypto
        .randomBytes(Math.ceil(rounds / 2))
        .toString('hex')
        .slice(0, rounds);
};

export const hashPassword = ({password, salt}: {password: string; salt: string}) => {
    const hash = crypto.createHmac('sha512', salt);
    hash.update(password);
    return hash.digest('hex');
};

export const comparePasswords = ({
    inputPassword,
    storedPassword,
    salt,
}: {
    inputPassword: string;
    storedPassword: string;
    salt: string;
}) => {
    const hashedInputPassword = hashPassword({
        password: inputPassword,
        salt,
    });

    if (hashedInputPassword === storedPassword) {
        return true;
    }

    return false;
};
