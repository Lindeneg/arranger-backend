export const RULE = {
    PW_MIN_LEN: 8,
    PW_MAX_LEN: 32,
    USR_MIN_LEN: 4,
    USR_MAX_LEN: 16,
    BRD_MAX_LEN: 16,
    LST_MAX_LEN: 16,
    CRD_NAME_MAX_LEN: 19,
    CRD_DES_MAX_LEN: 512,
    CHK_OBJ_MAX_LEN: 80,
    COL_MIN_LEN: 3,
    COL_MAX_LEN: 6
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
