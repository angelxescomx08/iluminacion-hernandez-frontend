export type LoginEmailCredentials = {
    email: string;
    password: string;
    rememberMe?: boolean;
    callbackURL?: string;
};

export type RegisterEmailCredentials = {
    name: string;
    email: string;
    password: string;
    rememberMe?: boolean;
    callbackURL?: string;
};

export type GoogleLoginOptions = {
    callbackURL?: string;
    errorCallbackURL?: string;
};
