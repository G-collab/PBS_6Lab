const express = require("express");
const bodyParser = require("body-parser");
const jwt = require('jsonwebtoken');
const jwkToPem = require("jwk-to-pem");
const auth0 = require("./auth");
const path = require("path");
const port = 3000;

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const SESSION_KEY = 'authorization';

const login = async (req, res) => {
  const { login, password } = req.body;

  const tokens = await auth0.getTokens(login, password);

  if (tokens) {
    res.cookie("refresh_token", tokens.refresh_token);
    res.status(200).json({ token: tokens.access_token }).send();
  } else {
    res.status(401).send();
  }
};

const refreshTokenIfNeeded = async (req, expires) => {
    const expMins = (expires * 1000 - new Date()) / 1000 / 60;

    if (req?.cookies?.refresh_token && expMins < 5) {
        const tokens = await auth0.refreshToken(req.cookies.refresh_token);
        res.cookie("refresh_token", tokens.refresh_token, {
            httpOnly: true,
            secure: false,
        });
        res.json({ token: tokens.access_token });
    }
};

const validateJwt = async (token) => {
    const jwks = await auth0.getJwks();
    const res = jwt.verify(token, jwkToPem(jwks));
  
    return {
        exp: res.exp,
        username: res.sub,
    };
  };

app.use(async (req, res, next) => {
    const token = req.headers[SESSION_KEY];
    if (token?.length) {
      try {
          const data = await validateJwt(token);
          req.session = data;
          await refreshTokenIfNeeded(req, data.exp);
      } catch(err) {
          console.log(err);
      }
  }

  next();
  }
);

app.get("/", (req, res) => {
  if (req.session?.username) {
    return res.json({
      username: req.session.username,
      logout: "http://localhost:3000/logout",
    });
  }

  res.sendFile(path.join(__dirname + "/index.html"));
});

app.get("/oidc-callback", async (req, res) => {
  const tokens = await auth0.getTokensFromCode(req.query.code);

  if (tokens) {
    res.cookie("refresh_token", tokens.refresh_token);
    res.cookie("access_token", tokens.access_token);

    res.redirect("/");
  } else {
    res.status(401).send();
  }
});

app.get("/logout", (req, res) => {
  sessions.destroy(req, res);
  res.clearCookie("refresh_token");
  res.clearCookie("access_token");
  res.redirect("/");
});

app.post("/api/login", async (req, res) => {
  const redirectUrl = auth0.getLoginRedirectUri();
  res.json({ redirectUrl });
});

app.post("/api/register", async (req, res) => {
  await auth0.createUser(req.body.login, req.body.password);
  return await login(req, res);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
