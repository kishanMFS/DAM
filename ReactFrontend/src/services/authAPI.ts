// const loginAPI: string = process.env.VITE_loginAPI || "";
const loginAPI: string = import.meta.env.VITE_API + "/auth/login";
const logoutAPI: string = import.meta.env.VITE_API + "/auth/logout";
const verifyAPI: string = import.meta.env.VITE_API + "/auth/verify";

type loginUserServiceType = {
  access_token?: string;
  statusCode?: number;
  message: string;
};
interface callApiType<T> {
  apiURL: string;
  param?: object;
  onProgress: (value: number) => void;
  resolve: (value: T) => void;
  reject: (value: unknown) => void;
}
interface loginUserType {
  callApi: <T>(args: callApiType<T>) => void;
  credentials: { email: string; password: string };
  onProgress: (value: number) => void;
}

export function loginUserService({
  callApi,
  credentials,
  onProgress,
}: loginUserType): Promise<loginUserServiceType> {
  return new Promise<loginUserServiceType>((resolve, reject) => {
    callApi({
      apiURL: loginAPI,
      param: credentials,
      onProgress,
      resolve,
      reject,
    });
  });
}


type logoutUserServiceType = {
  success: boolean,
  message: string
}

interface logoutUserType {
  callApi: <T>(args: callApiType<T>) => void;
  onProgress: (value: number) => void;
}

export function logoutUserService({
  callApi,
  onProgress
}: logoutUserType): Promise<logoutUserServiceType> {
  return new Promise<logoutUserServiceType>((resolve, reject) => {
    callApi({
      apiURL: logoutAPI,
      onProgress,
      resolve,
      reject,
    });
  });
}

type verifyUserServiceType = {
  isValid : boolean,
  message : string
}
interface verifyUserType {
  callApi: <T>(args: callApiType<T>) => void
  onProgress: (value: number) => void;
  resolve: (value: verifyUserServiceType) => void;
  reject: (value: unknown) => void;
}

export function verifyUserService({
  callApi,
  onProgress
}: verifyUserType): Promise<verifyUserServiceType> {
  return new Promise<verifyUserServiceType>((resolve, reject) => {
    callApi({
      apiURL: verifyAPI,
      onProgress,
      resolve,
      reject,
    });
  });
}

