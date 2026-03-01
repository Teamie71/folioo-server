export const extractAccessTokenFromAuthorization = (authorization?: string): string | null => {
    if (!authorization) {
        return null;
    }

    const [scheme, token] = authorization.split(' ');
    if (scheme !== 'Bearer' || !token) {
        return null;
    }

    return token;
};
