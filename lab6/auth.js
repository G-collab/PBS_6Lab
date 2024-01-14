const axios = require("axios").default;

const AUDIENCE = "https://SOA.com/";
const AUTH0_URL = "dev-beung3qyfeis7op8.eu.auth0.com/authorize";
const CLIENT_ID = "5JxuLJMgOPRUbjrZVt8M5RuT1UzNQWBB";
const CLIENT_SECRET = "1W3dH5BFZGKmRSGIP6EB-M3GTLyh0dcbLjN5K_gHS9ec2ENF7apgHxs0ejMskzpa";

const getTokens = async (email, password) => {
  const authResponse = await axios.post(AUTH0_URL + "oauth/token", {
    grant_type: "password",
    username: email,
    password: password,
    audience: AUDIENCE,
    scope: "offline_access",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });

  if (authResponse.status !== 200) {
    return null;
  }

  return {
    access_token: authResponse.data.access_token,
    refresh_token: authResponse.data.refresh_token,
  };
};

const refreshToken = async (refreshToken) => {
  const authResponse = await axios.post(`${AUTH0_URL}oauth/token`, {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });

  if (authResponse.status !== 200) {
    return null;
  }

  return {
    access_token: authResponse.data.access_token,
    refresh_token: authResponse.data.refresh_token,
  };
};

const getManagementToken = async () => {
  try {
    const authResponse = await axios.post(AUTH0_URL + "oauth/token", {
      grant_type: "client_credentials",
      audience: `${AUTH0_URL}api/v2/`,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    });

    if (authResponse.status !== 200) {
      return null;
    }

    return authResponse.data.access_token;
  } catch (error) {
    console.log(error);
    return null;
  }
};

const getJwks = async () => {
  const authResponse = await axios.get(AUTH0_URL + ".well-known/jwks.json");
  if (authResponse.status !== 200) {
    return null;
  }
  
  return authResponse.data.keys[0];
};

const createUser = async (email, password) => {
  try {
    const managementToken = await getManagementToken();
    const authResponse = await axios.post(
      `${AUTH0_URL}api/v2/users`,
      {
        email,
        password,
        connection: "Username-Password-Authentication",
      },
      {
        headers: {
          Authorization: `Bearer ${managementToken}`,
        },
      }
    );

    if (authResponse.status !== 200) {
      return null;
    }
  } catch (error) {
    console.log(error);
    return null;
  }
};

const getLoginRedirectUri = () => {
  const localRedirectUri = encodeURIComponent(
    "http://localhost:3000/oidc-callback"
  );

  return `${AUTH0_URL}authorize?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${localRedirectUri}&scope=offline_access&audience=${AUDIENCE}`;
};

const getTokensFromCode = async (code) => {
  try {
    const localRedirectUri = encodeURIComponent("http://localhost:3000");
    console.log(localRedirectUri);

    const data = {
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code: code,
      audience: AUDIENCE,
      redirect_uri: "http://localhost:3000",
    };

    const authResponse = await axios.post(AUTH0_URL + "oauth/token", data, {
      headers: { "content-type": "application/x-www-form-urlencoded" },
    });

    if (authResponse.status !== 200) {
      return null;
    }

    return {
      access_token: authResponse.data.access_token,
      refresh_token: authResponse.data.refresh_token,
    };
  } catch (error) {
    console.log(error);
    return null;
  }
};

module.exports = {
  getTokensFromCode,
  getLoginRedirectUri,
  createUser,
  getTokens,
  refreshToken,
  getJwks,
};
