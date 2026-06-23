const envInfo = import.meta.env;
const currentEnvironment = envInfo.MODE;

export const isProd = currentEnvironment === "production";
