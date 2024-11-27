import type {NodeKit} from '@gravity-ui/nodekit';
import {initDB as initPosgresDB} from '@gravity-ui/postgreskit';

const DEFAULT_QUERY_TIMEOUT = 20000;

const camelCase = (str: string) => {
    const wordPattern = new RegExp(
        ['[A-Z][a-z]+', '[A-Z]+(?=[A-Z][a-z])', '[A-Z]+', '[a-z]+', '[0-9]+'].join('|'),
        'g',
    );
    const words = str.match(wordPattern) || [];
    return words
        .map((word, index) => (index === 0 ? word : word[0].toUpperCase() + word.slice(1)))
        .join('');
};

const convertCamelCase = (dataObj = {}) => {
    return Object.entries(dataObj).reduce((dataObjFormed: {[key: string]: unknown}, objEntry) => {
        const [property, value] = objEntry;

        const propertyCamelCase = camelCase(property).replace(/(uuid)/gi, (foundValue: string) =>
            foundValue.toUpperCase(),
        );

        // eslint-disable-next-line no-param-reassign
        dataObjFormed[propertyCamelCase] = value;

        return dataObjFormed;
    }, {});
};

interface OrigImplFunction {
    (snakeCaseFormat: string): string;
}

export const getKnexOptions = () => ({
    client: 'pg',
    pool: {
        min: 0,
        max: 15,
        acquireTimeoutMillis: 40000,
        createTimeoutMillis: 50000,
        idleTimeoutMillis: 45000,
        reapIntervalMillis: 1000,
    },
    acquireConnectionTimeout: 10000,
    postProcessResponse: (result: unknown): unknown => {
        let dataFormed;

        if (Array.isArray(result)) {
            dataFormed = result.map((dataObj) => convertCamelCase(dataObj));
        } else if (result !== null && typeof result === 'object') {
            dataFormed = convertCamelCase(result);
        } else {
            dataFormed = result;
        }

        return dataFormed;
    },
    wrapIdentifier: (value: string, origImpl: OrigImplFunction): string => {
        const snakeCaseFormat = value.replace(/(?=[A-Z])/g, '_').toLowerCase();

        return origImpl(snakeCaseFormat);
    },
    debug: false,
});

export const initDB = (nodekit: NodeKit) => {
    const dsnList = process.env.POSTGRES_DSN_LIST as string;

    const dispatcherOptions = {
        healthcheckInterval: 5000,
        healthcheckTimeout: 2000,
        suppressStatusLogs: true,
    };

    const {db, CoreBaseModel, helpers} = initPosgresDB({
        connectionString: dsnList,
        dispatcherOptions,
        knexOptions: getKnexOptions(),
        logger: {
            info: (...args) => nodekit.ctx.log(...args),
            error: (...args) => nodekit.ctx.logError(...args),
        },
    });

    async function getId() {
        const queryResult = await db.primary.raw('select get_id() as id');
        return queryResult.rows[0].id;
    }

    class Model extends CoreBaseModel {
        static DEFAULT_QUERY_TIMEOUT = DEFAULT_QUERY_TIMEOUT;
    }

    return {db, Model, getId, helpers};
};
