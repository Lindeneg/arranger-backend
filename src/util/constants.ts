export const RULE = {
    PW_MIN_LEN: 8,
    PW_MAX_LEN: 32,
    USR_MIN_LEN: 4,
    USR_MAX_LEN: 16,
    BRD_MAX_LEN: 16,
    DEFAULT_MAX_LEN: 256,
    CHECKLIST_MAX_LEN: 512,
    DES_MAX_LEN: 2048
};

export const requiredEnvVars: string[] = [
    'MONGO_DB_USER',
    'MONGO_DB_KEY',
    'MONGO_DB_NAME',
    'MONGO_DB_CLUSTER',
    'JWT_PRIVATE_TOKEN',
    'WHITELISTED_DOMAIN',
    'PORT'
];
